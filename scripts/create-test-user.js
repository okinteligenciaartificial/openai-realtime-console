import 'dotenv/config';
import pool from '../config/database.js';

async function createTestUser() {
  try {
    // Criar usuário de teste
    const result = await pool.query(
      `INSERT INTO users (email, name, role, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, email, name`,
      ['test@example.com', 'Test User', 'student']
    );

    const user = result.rows[0];
    console.log('✅ Test user created/updated:');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log('\n💡 Use this User ID in your client:');
    console.log(`localStorage.setItem('userId', '${user.id}');`);
    
    // Criar assinatura com plano Free
    const planResult = await pool.query(
      'SELECT id FROM user_plans WHERE name = $1 LIMIT 1',
      ['Free']
    );

    if (planResult.rows.length > 0) {
      await pool.query(
        `INSERT INTO user_subscriptions (user_id, plan_id, start_date, is_active)
         VALUES ($1, $2, CURRENT_TIMESTAMP, true)
         ON CONFLICT DO NOTHING`,
        [user.id, planResult.rows[0].id]
      );
      console.log('✅ Subscription created with Free plan');
    }

    await pool.end();
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();

