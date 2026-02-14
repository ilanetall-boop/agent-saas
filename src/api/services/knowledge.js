/**
 * Knowledge Base Service
 * Manages community learning, solution sharing, and anonymization
 */

const db = require('../db/db');
const { anonymizeFeedback } = require('./anonymization');

/**
 * Contribute a solution to Knowledge Base
 */
async function contributeSolution(userId, data) {
    try {
        const {
            category,
            name,
            description,
            solution,
            difficulty = 'intermediate',
            share_to_community = true
        } = data;

        // Check user community settings
        const settings = await getUserCommunitySettings(userId);
        if (!settings || !settings.contribute_to_community) {
            return {
                success: false,
                error: 'Community contributions disabled in your settings'
            };
        }

        // Insert solution
        const result = await db.run(`
            INSERT INTO knowledge_solutions 
            (category, name, description, solution, difficulty, created_by_user_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, category, name, success_rate
        `, [category, name, description, solution, difficulty, userId]);

        const solutionId = result.rows[0].id;

        // Update contribution count
        await db.run(`
            UPDATE user_community_settings 
            SET contributions_count = contributions_count + 1
            WHERE user_id = $1
        `, [userId]);

        console.log(`[Knowledge] ${userId} contributed solution: ${name}`);

        return {
            success: true,
            solution_id: solutionId,
            message: 'Solution shared with community!',
            impact: 'Your solution will help others solve this problem'
        };
    } catch (error) {
        console.error('[Knowledge] Contribute error:', error);
        throw error;
    }
}

/**
 * Report solution usage (success/failure)
 */
async function reportUsage(userId, data) {
    try {
        const {
            solution_id,
            success,
            time_taken_minutes,
            feedback,
            errors_encountered = [],
            share_feedback = true
        } = data;

        // Check user community settings
        const settings = await getUserCommunitySettings(userId);
        const shouldShare = settings && settings.allow_usage_tracking && share_feedback;

        // Anonymize feedback if sharing
        const anonymizedFeedback = shouldShare ? anonymizeFeedback(feedback) : feedback;

        // Record usage
        const result = await db.run(`
            INSERT INTO solution_usage 
            (user_id, solution_id, success, time_taken_minutes, feedback, errors_encountered, shared_to_community)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `, [userId, solution_id, success, time_taken_minutes, anonymizedFeedback, errors_encountered, shouldShare]);

        // Update solution effectiveness
        await updateSolutionEffectiveness(solution_id, success, time_taken_minutes);

        // Get updated stats
        const stats = await getSolutionStats(solution_id);

        console.log(`[Knowledge] Usage reported for ${solution_id}: success=${success}`);

        return {
            success: true,
            solution_effectiveness_now: stats.success_rate,
            attempt_count: stats.attempt_count,
            message: `Thanks for feedback! This solution helped ${stats.attempt_count} users already`,
            your_impact: shouldShare ? `Your feedback helps improve this solution` : null
        };
    } catch (error) {
        console.error('[Knowledge] Report usage error:', error);
        throw error;
    }
}

/**
 * Get solutions by category
 */
async function getSolutionsByCategory(category) {
    try {
        const result = await db.run(`
            SELECT 
                id,
                category,
                name,
                description,
                success_rate,
                avg_time_minutes,
                attempt_count,
                quality_score,
                difficulty
            FROM knowledge_solutions
            WHERE category = $1 AND success_rate > 0.5
            ORDER BY success_rate DESC, attempt_count DESC
            LIMIT 20
        `, [category]);

        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            success_rate: parseFloat(row.success_rate),
            avg_time_minutes: row.avg_time_minutes,
            attempt_count: row.attempt_count,
            quality_score: parseFloat(row.quality_score),
            difficulty: row.difficulty,
            recommended: row.success_rate >= 0.8,
            why_recommended: `${Math.round(row.success_rate * 100)}% success rate, ${row.attempt_count} users tried`
        }));
    } catch (error) {
        console.error('[Knowledge] Get solutions error:', error);
        throw error;
    }
}

/**
 * Find solutions for a problem
 */
async function findSolutionsForProblem(problemQuery) {
    try {
        // Simple search by name/description
        const result = await db.run(`
            SELECT 
                id,
                name,
                description,
                solution,
                success_rate,
                avg_time_minutes,
                attempt_count,
                quality_score,
                difficulty,
                errors_encountered,
                resolution
            FROM knowledge_solutions
            WHERE 
                name ILIKE $1 OR 
                description ILIKE $1 OR
                resolution ILIKE $1
            AND success_rate > 0.5
            ORDER BY success_rate DESC, attempt_count DESC
            LIMIT 5
        `, [`%${problemQuery}%`]);

        return {
            matching_solutions: result.rows.map(row => ({
                id: row.id,
                name: row.name,
                description: row.description,
                steps: row.solution,
                success_rate: parseFloat(row.success_rate),
                estimated_time: row.avg_time_minutes,
                difficulty: row.difficulty,
                common_issues: row.errors_encountered || [],
                solutions_to_issues: row.resolution ? [row.resolution] : []
            })),
            community_info: `${result.rows.reduce((sum, r) => sum + r.attempt_count, 0)} users solved similar problems`,
            you_already_know: false
        };
    } catch (error) {
        console.error('[Knowledge] Find solutions error:', error);
        throw error;
    }
}

/**
 * Update solution effectiveness based on usage
 */
async function updateSolutionEffectiveness(solutionId, success, timeMinutes) {
    try {
        // Get current stats
        const current = await db.get(`
            SELECT attempt_count, success_count, avg_time_minutes
            FROM knowledge_solutions
            WHERE id = $1
        `, [solutionId]);

        if (!current) return;

        const newAttempts = current.attempt_count + 1;
        const newSuccesses = current.success_count + (success ? 1 : 0);
        const newRate = newSuccesses / newAttempts;

        // Calculate new average time
        const newTime = timeMinutes 
            ? Math.round((current.avg_time_minutes * current.attempt_count + timeMinutes) / newAttempts)
            : current.avg_time_minutes;

        // Update
        await db.run(`
            UPDATE knowledge_solutions
            SET 
                attempt_count = $1,
                success_count = $2,
                success_rate = $3,
                avg_time_minutes = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
        `, [newAttempts, newSuccesses, newRate, newTime, solutionId]);

        console.log(`[Knowledge] Updated effectiveness for ${solutionId}: ${(newRate * 100).toFixed(1)}%`);
    } catch (error) {
        console.error('[Knowledge] Update effectiveness error:', error);
        throw error;
    }
}

/**
 * Get solution effectiveness stats
 */
async function getSolutionStats(solutionId) {
    try {
        const result = await db.get(`
            SELECT 
                success_rate,
                avg_time_minutes,
                attempt_count,
                success_count,
                quality_score
            FROM knowledge_solutions
            WHERE id = $1
        `, [solutionId]);

        return {
            success_rate: parseFloat(result?.success_rate || 0),
            avg_time_minutes: result?.avg_time_minutes || 0,
            attempt_count: result?.attempt_count || 0,
            success_count: result?.success_count || 0,
            quality_score: parseFloat(result?.quality_score || 0)
        };
    } catch (error) {
        console.error('[Knowledge] Get stats error:', error);
        throw error;
    }
}

/**
 * Log Eva's recommendation
 */
async function logEvaRecommendation(userId, solutionId, recommended = true) {
    try {
        await db.run(`
            INSERT INTO knowledge_access_log 
            (user_id, solution_id, eva_referenced_solution, eva_recommended)
            VALUES ($1, $2, $3, $4)
        `, [userId, solutionId, true, recommended]);
    } catch (error) {
        console.error('[Knowledge] Log recommendation error:', error);
        // Non-critical, don't throw
    }
}

/**
 * Get user community settings
 */
async function getUserCommunitySettings(userId) {
    try {
        const result = await db.get(`
            SELECT 
                contribute_to_community,
                allow_pattern_sharing,
                allow_usage_tracking,
                privacy_level,
                contributions_count,
                solutions_helped_count
            FROM user_community_settings
            WHERE user_id = $1
        `, [userId]);

        // Create default settings if not found
        if (!result) {
            await db.run(`
                INSERT INTO user_community_settings (user_id)
                VALUES ($1)
                ON CONFLICT (user_id) DO NOTHING
            `, [userId]);

            return {
                contribute_to_community: true,
                allow_pattern_sharing: true,
                allow_usage_tracking: true,
                privacy_level: 'community',
                contributions_count: 0,
                solutions_helped_count: 0
            };
        }

        return result;
    } catch (error) {
        console.error('[Knowledge] Get settings error:', error);
        throw error;
    }
}

/**
 * Update user community settings
 */
async function updateUserCommunitySettings(userId, updates) {
    try {
        const {
            contribute_to_community,
            allow_pattern_sharing,
            allow_usage_tracking,
            privacy_level
        } = updates;

        const fields = [];
        const values = [userId];
        let paramCount = 2;

        if (contribute_to_community !== undefined) {
            fields.push(`contribute_to_community = $${paramCount++}`);
            values.push(contribute_to_community);
        }
        if (allow_pattern_sharing !== undefined) {
            fields.push(`allow_pattern_sharing = $${paramCount++}`);
            values.push(allow_pattern_sharing);
        }
        if (allow_usage_tracking !== undefined) {
            fields.push(`allow_usage_tracking = $${paramCount++}`);
            values.push(allow_usage_tracking);
        }
        if (privacy_level !== undefined) {
            fields.push(`privacy_level = $${paramCount++}`);
            values.push(privacy_level);
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);

        if (fields.length > 1) {
            await db.run(
                `UPDATE user_community_settings SET ${fields.join(', ')} WHERE user_id = $1`,
                values
            );
        }

        return { success: true };
    } catch (error) {
        console.error('[Knowledge] Update settings error:', error);
        throw error;
    }
}

/**
 * Get community impact stats
 */
async function getUserImpact(userId) {
    try {
        const result = await db.get(`
            SELECT 
                contributions_count,
                solutions_helped_count
            FROM user_community_settings
            WHERE user_id = $1
        `, [userId]);

        if (!result) {
            return { contributions_count: 0, solutions_helped_count: 0 };
        }

        return result;
    } catch (error) {
        console.error('[Knowledge] Get impact error:', error);
        throw error;
    }
}

module.exports = {
    contributeSolution,
    reportUsage,
    getSolutionsByCategory,
    findSolutionsForProblem,
    updateSolutionEffectiveness,
    getSolutionStats,
    logEvaRecommendation,
    getUserCommunitySettings,
    updateUserCommunitySettings,
    getUserImpact
};
