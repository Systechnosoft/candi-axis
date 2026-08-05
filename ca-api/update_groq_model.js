const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:ca_dev_123456password@db.xowbipxwcqayslpueyxt.supabase.co:5432/postgres'
});

async function forceUpdateGroqModel() {
  try {
    // Select ALL settings to find where llama-3 is hiding
    const res = await pool.query("SELECT * FROM ca_admin_settings");
    
    let updatedCount = 0;
    console.log(`Found ${res.rows.length} total admin settings.`);
    
    for (const settings of res.rows) {
      // setting_value could be an object if the column is JSON/JSONB
      const valueStr = settings.setting_value ? JSON.stringify(settings.setting_value) : '';
      
      // Check if setting_value contains 'llama-3'
      if (valueStr.includes('llama-3') && !valueStr.includes('llama-3.3')) {
        console.log(`Found legacy model string in key: ${settings.setting_key}. Value: ${settings.setting_value}`);
        
        // Ensure it's correctly formatted as a JSON string
        const newValue = JSON.stringify("llama-3.3-70b-versatile");
        
        const updateRes = await pool.query(
          "UPDATE ca_admin_settings SET setting_value = $1, updated_at = now() WHERE id = $2 RETURNING *",
          [newValue, settings.id]
        );
        updatedCount++;
      }
    }
    
    if (updatedCount > 0) {
      console.log(`Successfully forced update on ${updatedCount} setting(s).`);
    } else {
      console.log("No legacy llama-3 strings found anywhere in ca_admin_settings.");
    }
  } catch (err) {
    console.error('Error updating config:', err);
  } finally {
    await pool.end();
  }
}

forceUpdateGroqModel();
