/**
 * N8N Setup Script
 * Initializes N8N with workflows for Eva integrations
 *
 * Usage: N8N_URL=https://your-n8n.com N8N_API_KEY=xxx node n8n/setup.js
 */

const fs = require('fs');
const path = require('path');

const N8N_URL = process.env.N8N_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_API_KEY) {
    console.error('❌ N8N_API_KEY is required');
    console.log('Usage: N8N_URL=https://your-n8n.com N8N_API_KEY=xxx node n8n/setup.js');
    process.exit(1);
}

const headers = {
    'Content-Type': 'application/json',
    'X-N8N-API-KEY': N8N_API_KEY
};

async function checkConnection() {
    console.log(`\n🔌 Checking connection to ${N8N_URL}...`);

    try {
        const res = await fetch(`${N8N_URL}/api/v1/workflows`, { headers });
        if (res.ok) {
            const data = await res.json();
            console.log(`✅ Connected! Found ${data.data?.length || 0} existing workflows`);
            return true;
        } else {
            console.error(`❌ Connection failed: ${res.status} ${res.statusText}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Connection error: ${error.message}`);
        return false;
    }
}

async function importWorkflow(workflowPath) {
    const name = path.basename(workflowPath, '.json');
    console.log(`\n📦 Importing workflow: ${name}`);

    try {
        const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

        // Check if workflow exists
        const checkRes = await fetch(`${N8N_URL}/api/v1/workflows`, { headers });
        const existing = await checkRes.json();
        const existingWorkflow = existing.data?.find(w => w.name === workflowData.name);

        if (existingWorkflow) {
            console.log(`   ⏭️  Workflow "${workflowData.name}" already exists (id: ${existingWorkflow.id})`);
            return existingWorkflow.id;
        }

        // Create workflow
        const res = await fetch(`${N8N_URL}/api/v1/workflows`, {
            method: 'POST',
            headers,
            body: JSON.stringify(workflowData)
        });

        if (res.ok) {
            const data = await res.json();
            console.log(`   ✅ Created workflow "${workflowData.name}" (id: ${data.id})`);

            // Activate workflow
            await fetch(`${N8N_URL}/api/v1/workflows/${data.id}/activate`, {
                method: 'POST',
                headers
            });
            console.log(`   🟢 Activated`);

            return data.id;
        } else {
            const error = await res.text();
            console.error(`   ❌ Failed to create: ${error}`);
            return null;
        }
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log('🚀 N8N Setup for MyBestAgent');
    console.log('================================');

    // Check connection
    const connected = await checkConnection();
    if (!connected) {
        console.log('\n💡 Make sure N8N is running and API key is correct');
        process.exit(1);
    }

    // Get all workflow files
    const workflowsDir = path.join(__dirname, 'workflows');
    const workflows = fs.readdirSync(workflowsDir)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(workflowsDir, f));

    console.log(`\n📂 Found ${workflows.length} workflows to import`);

    // Import each workflow
    const results = [];
    for (const workflow of workflows) {
        const id = await importWorkflow(workflow);
        results.push({ workflow: path.basename(workflow), id, success: !!id });
    }

    // Summary
    console.log('\n================================');
    console.log('📊 Summary:');
    const successful = results.filter(r => r.success).length;
    console.log(`   ✅ ${successful}/${results.length} workflows imported`);

    if (successful < results.length) {
        console.log('\n⚠️  Some workflows failed. Check the logs above.');
    }

    console.log('\n🎉 Setup complete!');
    console.log(`\n📍 N8N Dashboard: ${N8N_URL}`);
    console.log('📍 Webhook URLs:');
    results.filter(r => r.success).forEach(r => {
        const name = r.workflow.replace('.json', '');
        console.log(`   ${N8N_URL}/webhook/${name}`);
    });
}

main().catch(console.error);
