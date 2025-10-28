import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const data = searchParams.get('data');
    const sizeParam = searchParams.get('size') ?? '256';
    const size = Math.max(64, Math.min(1024, Number(sizeParam) || 256));
    
    if (!data) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const png = await QRCode.toBuffer(data, {
      type: 'png',
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    return new NextResponse(png as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('QR generation error:', e);
    return NextResponse.json({ error: 'QR generation failed' }, { status: 500 });
  }
}

