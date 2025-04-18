import { NextRequest, NextResponse } from "next/server";
import * as AWS from '@aws-sdk/client-s3';
import { dbPool } from "@/lib/db";

export async function POST(req: NextRequest) {

  // Get form data
  const formData = await req.formData();
  const fileName = formData.get('fileName');
  const fileData = formData.get('fileData');
  const name = formData.get('name');
  const agencyId = formData.get('agencyId');

  // S3 client
  // @ts-ignore
  const client = new AWS.S3({
    forcePathStyle: true,
    region: 'ap-southeast-1',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    }
  })

  // Missing fields
  if (!fileName || !fileData || !name || !agencyId) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  // Check if valid agency
  const result = await dbPool.query('SELECT id,name FROM agencies WHERE id = $1', [agencyId]);
  if (!result.rowCount)
    return NextResponse.json({
      error: 'Invalid Agency ID.'
    })

  // Upload object
  const response = await client.send(new AWS.PutObjectCommand({
    Key: fileName as string,
    Body: new Uint8Array(await (fileData as File).arrayBuffer()),
    ContentType: (fileData as File).type as string,
    Bucket: 'resume-bucket',
  }))

  // resumeURL
  const resumeURL = process.env.S3_PUBLIC_BUCKET || 'https://rovhuynfesqymtohtjye.supabase.co/storage/v1/object/public/resume-bucket//' + encodeURI(fileName as string);

  // Write entry to db
  await dbPool.query(
    `INSERT INTO candidates (agency_id, name, fields, resume_url)
     VALUES ($1, $2, $3, $4) 
    `,
    [agencyId, name, {}, resumeURL]
  );

  return NextResponse.json({
    etag: response.ETag,
    error: !response.ETag
  })
}
