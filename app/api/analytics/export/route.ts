import { NextResponse } from 'next/server';
import { db } from '@/app/db/client';
import { users, visits } from '@/app/db/schema';
import { and, eq, gte, lte, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

async function checkAuth(request: Request): Promise<boolean> {
  const token = process.env.ANALYTICS_EXPORT_TOKEN;
  if (!token) {
    console.warn('[EXPORT API] ANALYTICS_EXPORT_TOKEN not set');
    return false;
  }

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const providedToken = authHeader.substring(7);
    if (providedToken === token) return true;
  }

  // Check query parameter
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  if (queryToken === token) return true;

  return false;
}

export async function GET(request: Request) {
  try {
    // Auth check
    if (!(await checkAuth(request))) {
      console.warn('[EXPORT API] Unauthorized export attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const tableParam = url.searchParams.get('table') || 'visits';
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');
    const slugParam = url.searchParams.get('slug');
    const limitParam = parseInt(url.searchParams.get('limit') || '5000');
    const limit = Math.min(Math.max(limitParam, 1), 100000);

    // Validate table
    if (!['users', 'visits'].includes(tableParam)) {
      return NextResponse.json({ error: 'Invalid table parameter' }, { status: 400 });
    }

    console.log('[EXPORT API] Export request', { table: tableParam, limit, slug: slugParam });

    const csvLines: string[] = [];

    if (tableParam === 'visits') {
      // Build filters
      const filters = [];
      if (fromParam) {
        filters.push(gte(visits.visitedAt, new Date(fromParam)));
      }
      if (toParam) {
        filters.push(lte(visits.visitedAt, new Date(toParam)));
      }
      if (slugParam) {
        filters.push(eq(visits.slug, slugParam));
      }

      // Fetch data
      let query = db.select().from(visits).orderBy(desc(visits.visitedAt));
      if (filters.length > 0) {
        query = query.where(and(...filters)) as typeof query;
      }
      const data = await query.limit(limit);

      // CSV headers
      csvLines.push('visited_at,user_id,slug,path,referrer,ip_hash,ua,ch');

      // CSV rows
      for (const row of data) {
        const visitedAt = row.visitedAt ? new Date(row.visitedAt).toISOString() : '';
        const line = [
          visitedAt,
          row.userId || '',
          row.slug || '',
          row.path || '',
          row.referrer || '',
          row.ipHash || '',
          (row.ua || '').replace(/"/g, '""'), // Escape quotes
          (row.ch || '').replace(/"/g, '""'),
        ].map(field => `"${field}"`).join(',');
        csvLines.push(line);
      }
    } else {
      // Users export
      const filters = [];
      if (fromParam) {
        filters.push(gte(users.lastTimestamp, new Date(fromParam)));
      }
      if (toParam) {
        filters.push(lte(users.lastTimestamp, new Date(toParam)));
      }

      let query = db.select().from(users);
      if (filters.length > 0) {
        query = query.where(and(...filters)) as typeof query;
      }
      const data = await query.limit(limit);

      csvLines.push('user_id,email,qty_of_visits,first_timestamp,last_timestamp');

      for (const row of data) {
        const firstTs = row.firstTimestamp ? new Date(row.firstTimestamp).toISOString() : '';
        const lastTs = row.lastTimestamp ? new Date(row.lastTimestamp).toISOString() : '';
        const line = [
          row.userId || '',
          row.email || '',
          row.qtyOfVisits || 0,
          firstTs,
          lastTs,
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
        csvLines.push(line);
      }
    }

    const csv = csvLines.join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${tableParam}_${Date.now()}.csv"`,
      },
    });
  } catch (e) {
    console.error('[EXPORT API] Export error', e);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

// Other methods return 405
export async function POST() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

