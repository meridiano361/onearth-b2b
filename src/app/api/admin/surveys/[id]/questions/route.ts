import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

interface QuestionInput {
  id?: string;
  questionText: string;
  questionType: string;
  optionsJson: string[] | null;
  required: boolean;
  sortOrder: number;
}

function randomKey() {
  return `q_${Math.random().toString(36).slice(2, 11)}`;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const { questions } = await req.json() as { questions: QuestionInput[] };

  const existing = await prisma.surveyQuestion.findMany({
    where: { surveyId: params.id },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((q) => q.id));
  const incomingIds = new Set(questions.filter((q) => q.id && existingIds.has(q.id)).map((q) => q.id!));

  // Delete questions removed from the list
  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
  if (toDelete.length > 0) {
    await prisma.surveyAnswer.deleteMany({ where: { response: { surveyId: params.id }, questionKey: { in: await prisma.surveyQuestion.findMany({ where: { id: { in: toDelete } }, select: { questionKey: true } }).then((qs) => qs.map((q) => q.questionKey)) } } });
    await prisma.surveyQuestion.deleteMany({ where: { id: { in: toDelete } } });
  }

  // Upsert in order
  const result = [];
  for (const q of questions) {
    if (q.id && existingIds.has(q.id)) {
      const updated = await prisma.surveyQuestion.update({
        where: { id: q.id },
        data: {
          questionText: q.questionText,
          questionType: q.questionType,
          optionsJson: q.optionsJson as any,
          required: q.required,
          sortOrder: q.sortOrder,
        },
      });
      result.push(updated);
    } else {
      const created = await prisma.surveyQuestion.create({
        data: {
          surveyId: params.id,
          questionKey: randomKey(),
          questionText: q.questionText,
          questionType: q.questionType,
          optionsJson: q.optionsJson as any,
          required: q.required,
          sortOrder: q.sortOrder,
        },
      });
      result.push(created);
    }
  }

  return NextResponse.json({ questions: result });
}
