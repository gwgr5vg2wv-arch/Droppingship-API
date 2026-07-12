import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

if (process.env.NODE_ENV === 'production') {
  console.error('Seed bloqueado em producao.');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL ausente. Configure um PostgreSQL local antes do seed.');
  process.exit(1);
}

const prisma = new PrismaClient();
const email = 'dev@droppingship.local';
const password = 'DevPassword123';

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: 'Usuario Desenvolvimento', passwordHash, status: 'active' },
    create: {
      name: 'Usuario Desenvolvimento',
      email,
      passwordHash,
      status: 'active',
      role: 'owner',
      emailVerifiedAt: new Date()
    }
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: 'dev_workspace_local' },
    update: { name: 'Workspace Desenvolvimento', ownerId: user.id, status: 'active' },
    create: { id: 'dev_workspace_local', name: 'Workspace Desenvolvimento', ownerId: user.id, status: 'active' }
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { role: 'owner', status: 'active', permissions: { all: true } },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
      permissions: { all: true }
    }
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      action: 'DEV_SEED_CREATED',
      entity: 'Workspace',
      entityId: workspace.id,
      after: { email, workspaceId: workspace.id }
    }
  });

  console.log('Seed de desenvolvimento criado.');
  console.log(`Email: ${email}`);
  console.log(`Senha: ${password}`);
} finally {
  await prisma.$disconnect();
}
