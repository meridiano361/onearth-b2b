import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { filenames } = (await req.json()) as { filenames: string[] };
    if (!filenames?.length) {
      return NextResponse.json({ error: 'Nessun filename' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const urls = await Promise.all(
      filenames.map(async (filename) => {
        const path = `products/${filename}`;
        const { data, error } = await supabase.storage
          .from('products')
          .createSignedUploadUrl(path, { upsert: true });
        if (error) throw new Error(`${filename}: ${error.message}`);
        return { filename, signedUrl: data.signedUrl, path };
      })
    );

    return NextResponse.json({ urls });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
