import 'dotenv/config';
import { query } from '../backend/src/services/database.js';
import { hashPassword } from '../backend/src/services/auth.js';

async function createSamanthaTeacher() {
  try {
    console.log('🎓 Criando professora Samantha...\n');

    // 1. Verificar se já existe um usuário para Samantha
    let userResult = await query(
      'SELECT id, email, name FROM users WHERE email = $1',
      ['samantha@transition2english.com']
    );

    let userId;
    if (userResult.rows.length === 0) {
      // Criar usuário para Samantha
      console.log('📝 Criando usuário para Samantha...');
      const passwordHash = await hashPassword('Samantha2024!');
      const userInsert = await query(
        `INSERT INTO users (email, name, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, email, name`,
        ['samantha@transition2english.com', 'Samantha', passwordHash, 'teacher']
      );
      userId = userInsert.rows[0].id;
      console.log(`✅ Usuário criado: ${userInsert.rows[0].name} (ID: ${userId})\n`);
    } else {
      userId = userResult.rows[0].id;
      console.log(`✅ Usuário já existe: ${userResult.rows[0].name} (ID: ${userId})\n`);
    }

    // 2. Verificar se já existe teacher para este usuário
    let teacherResult = await query(
      'SELECT id, user_id, teacher_code, image_url FROM teachers WHERE user_id = $1',
      [userId]
    );

    let teacherId;
    if (teacherResult.rows.length === 0) {
      // Criar teacher
      console.log('👩‍🏫 Criando registro de teacher...');
      const teacherInsert = await query(
        `INSERT INTO teachers (user_id, teacher_code, image_url, additional_attributes)
         VALUES ($1, $2, $3, $4)
         RETURNING id, teacher_code, image_url`,
        [
          userId,
          'SAMANTHA001',
          '/assets/samantha.jpg',
          JSON.stringify({
            bio: 'Experienced English teacher specializing in oral proficiency tests',
            languages: ['English', 'Portuguese'],
            specialties: ['Oral Tests', 'Conversation', 'Pronunciation']
          })
        ]
      );
      teacherId = teacherInsert.rows[0].id;
      console.log(`✅ Teacher criada: ${teacherInsert.rows[0].teacher_code} (ID: ${teacherId})`);
      console.log(`   Imagem: ${teacherInsert.rows[0].image_url}\n`);
    } else {
      teacherId = teacherResult.rows[0].id;
      // Atualizar imagem se necessário
      if (teacherResult.rows[0].image_url !== '/assets/samantha.jpg') {
        await query(
          'UPDATE teachers SET image_url = $1 WHERE id = $2',
          ['/assets/samantha.jpg', teacherId]
        );
        console.log(`✅ Teacher já existe, imagem atualizada (ID: ${teacherId})\n`);
      } else {
        console.log(`✅ Teacher já existe: ${teacherResult.rows[0].teacher_code} (ID: ${teacherId})\n`);
      }
    }

    // 3. Buscar todos os usuários estudantes
    console.log('👥 Buscando usuários estudantes...');
    const studentsResult = await query(
      'SELECT id, email, name FROM users WHERE role = $1 AND is_active = true',
      ['student']
    );
    console.log(`✅ Encontrados ${studentsResult.rows.length} estudantes\n`);

    // 4. Buscar planos disponíveis
    console.log('📋 Buscando planos disponíveis...');
    const plansResult = await query('SELECT id, name FROM user_plans WHERE is_active = true ORDER BY id LIMIT 1');
    let planId = null;
    if (plansResult.rows.length > 0) {
      planId = plansResult.rows[0].id;
      console.log(`✅ Plano encontrado: ${plansResult.rows[0].name} (ID: ${planId})\n`);
    } else {
      console.log('⚠️  Nenhum plano encontrado. Criando plano padrão...\n');
      const planInsert = await query(
        `INSERT INTO user_plans (name, monthly_token_limit, monthly_session_limit, cost_per_token, is_active, additional_attributes)
         VALUES ($1, $2, $3, $4, true, $5)
         RETURNING id, name`,
        [
          'Plano Básico',
          100000,
          10,
          0.00000075, // $0.15/1M input + $0.60/1M output / 2 = média
          JSON.stringify({ description: 'Plano básico para estudantes' })
        ]
      );
      planId = planInsert.rows[0].id;
      console.log(`✅ Plano criado: ${planInsert.rows[0].name} (ID: ${planId})\n`);
    }

    // 5. Associar estudantes à Samantha via subscriptions
    console.log('🔗 Associando estudantes à Samantha...\n');
    let associated = 0;
    let alreadyAssociated = 0;

    for (const student of studentsResult.rows) {
      // Verificar se já tem subscription ativa
      const existingSub = await query(
        `SELECT id FROM user_subscriptions 
         WHERE user_id = $1 AND is_active = true`,
        [student.id]
      );

      if (existingSub.rows.length === 0) {
        // Criar subscription
        await query(
          `INSERT INTO user_subscriptions (user_id, plan_id, teacher_id, is_active, start_date, additional_attributes)
           VALUES ($1, $2, $3, true, NOW(), $4)`,
          [student.id, planId, teacherId, JSON.stringify({})]
        );
        console.log(`✅ ${student.name} (${student.email}) associado à Samantha`);
        associated++;
      } else {
        // Atualizar subscription existente para incluir teacher
        await query(
          `UPDATE user_subscriptions SET teacher_id = $1 WHERE id = $2`,
          [teacherId, existingSub.rows[0].id]
        );
        console.log(`✅ ${student.name} (${student.email}) atualizado para Samantha`);
        alreadyAssociated++;
      }
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   - Professora: Samantha (ID: ${teacherId})`);
    console.log(`   - Imagem: /assets/samantha.jpg`);
    console.log(`   - Estudantes associados: ${associated} novos, ${alreadyAssociated} atualizados`);
    console.log(`   - Total: ${associated + alreadyAssociated} estudantes\n`);

    console.log('✅ Processo concluído com sucesso!\n');

  } catch (error) {
    console.error('❌ Erro ao criar professora Samantha:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

createSamanthaTeacher();

