import pool from '../config/database.js';
import 'dotenv/config';
import { hashPassword } from '../services/auth.js';

async function createAdminUser() {
  try {
    const email = process.argv[2] || 'admin@example.com';
    const name = process.argv[3] || 'Administrator';
    const password = process.argv[4] || null;

    console.log('Creating admin user...');
    console.log('Email:', email);
    console.log('Name:', name);

    // Verificar se o usuário já existe
    const existingUser = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );

    let userId;
    let passwordHash = null;

    if (password) {
      passwordHash = await hashPassword(password);
    }

    if (existingUser.rows.length > 0) {
      // Atualizar usuário existente para admin
      userId = existingUser.rows[0].id;
      await pool.query(
        `UPDATE users 
         SET role = 'admin', 
             password_hash = COALESCE($1, password_hash),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [passwordHash, userId]
      );
      console.log('✅ User updated to admin role');
    } else {
      // Criar novo usuário admin
      const result = await pool.query(
        `INSERT INTO users (email, name, role, password_hash, is_active)
         VALUES ($1, $2, 'admin', $3, true)
         RETURNING id, email, name, role`,
        [email, name, passwordHash]
      );
      userId = result.rows[0].id;
      console.log('✅ Admin user created');
    }

    // Criar assinatura com plano Premium (ilimitado)
    const premiumPlan = await pool.query(
      "SELECT id FROM user_plans WHERE name = 'Premium' LIMIT 1"
    );

    if (premiumPlan.rows.length > 0) {
      // Desativar assinaturas anteriores
      await pool.query(
        'UPDATE user_subscriptions SET is_active = false WHERE user_id = $1',
        [userId]
      );

      // Criar nova assinatura Premium
      await pool.query(
        `INSERT INTO user_subscriptions (user_id, plan_id, start_date, is_active)
         VALUES ($1, $2, CURRENT_TIMESTAMP, true)
         ON CONFLICT DO NOTHING`,
        [userId, premiumPlan.rows[0].id]
      );
      console.log('✅ Premium subscription created');
    }

    const finalUser = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [userId]
    );

    console.log('\n📋 Admin User Details:');
    console.log('User ID:', finalUser.rows[0].id);
    console.log('Email:', finalUser.rows[0].email);
    console.log('Name:', finalUser.rows[0].name);
    console.log('Role:', finalUser.rows[0].role);
    console.log('\n💡 Use these credentials to login:');
    console.log(`Email: ${email}`);
    if (password) {
      console.log(`Password: ${password}`);
    } else {
      console.log('Password: (none - you can login without password for now)');
    }

    await pool.end();
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();

