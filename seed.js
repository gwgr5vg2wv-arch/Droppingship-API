import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Hash da senha "Teste123"
  const passwordHash = await bcrypt.hash('Teste123', 12);

  // Criar usuário de teste
  const user = await prisma.user.upsert({
    where: { email: 'teste@example.com' },
    update: {},
    create: {
      email: 'teste@example.com',
      name: 'Usuário Teste',
      passwordHash,
      status: 'active',
      role: 'owner',
      emailVerifiedAt: new Date()
    }
  });

  console.log('Usuário criado:', user);

  // Criar workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Workspace Teste',
      description: 'Workspace para testes',
      members: {
        create: {
          userId: user.id,
          role: 'owner'
        }
      }
    }
  });

  console.log('Workspace criado:', workspace);
  console.log('\n📧 Email: teste@example.com');
  console.log('🔐 Senha: Teste123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n✅ Seed concluído!');
  })
  .catch(async (e) => {
    console.error('❌ Erro:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
