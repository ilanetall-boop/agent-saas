const express = require('express');
const { nanoid } = require('nanoid');
const { authMiddleware } = require('../middleware/auth');
const db = require('../db/db');

const router = express.Router();

// Create/Update a site (authenticated)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, slug, html, css, js } = req.body;
        const userId = req.user.id;

        if (!name || !html) {
            return res.status(400).json({ error: 'Name and HTML content required' });
        }

        // Generate slug if not provided
        const siteSlug = slug || name.toLowerCase()
            .replace(/[àáâãäå]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôõö]/g, 'o')
            .replace(/[ùúûü]/g, 'u')
            .replace(/[ç]/g, 'c')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);

        const siteId = nanoid();
        await db.createSite(siteId, userId, siteSlug, name, html, css || null, js || null);

        const siteUrl = `${req.protocol}://${req.get('host')}/sites/${siteSlug}`;

        res.json({
            success: true,
            site: {
                id: siteId,
                slug: siteSlug,
                name,
                url: siteUrl
            }
        });

    } catch (error) {
        console.error('Create site error:', error);
        res.status(500).json({ error: 'Failed to create site' });
    }
});

// List user's sites (authenticated)
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const sites = await db.getUserSites(req.user.id);
        res.json({ sites });
    } catch (error) {
        console.error('List sites error:', error);
        res.status(500).json({ error: 'Failed to list sites' });
    }
});

// Delete a site (authenticated)
router.delete('/:slug', authMiddleware, async (req, res) => {
    try {
        await db.deleteSite(req.user.id, req.params.slug);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete site error:', error);
        res.status(500).json({ error: 'Failed to delete site' });
    }
});

module.exports = router;
