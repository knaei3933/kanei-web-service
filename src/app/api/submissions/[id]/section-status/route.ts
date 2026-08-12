import { NextRequest, NextResponse } from "next/server";
import { readArtifact, writeArtifact } from "@/server/submission-storage";

const ARTIFACT_NAME = "approval-package.json";

// GET: section-level completion status (public — used by review & execution pages)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params;
    const content = await readArtifact(submissionId, ARTIFACT_NAME);

    if (!content) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const pkg = JSON.parse(content);
    const sectionStatus = pkg.sectionStatus ?? {};

    return NextResponse.json(sectionStatus);
  } catch (err) {
    console.error("Failed to get section status:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: update section-level completion status (public — operator workflow)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params;
    const body = await req.json();
    const { sectionId, completed } = body;

    if (!sectionId || typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request: sectionId and completed are required" },
        { status: 400 }
      );
    }

    const content = await readArtifact(submissionId, ARTIFACT_NAME);

    if (!content) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const pkg = JSON.parse(content);
    const currentStatus = pkg.sectionStatus ?? {};
    const updatedStatus = {
      ...currentStatus,
      [sectionId]: completed,
    };

    pkg.sectionStatus = updatedStatus;

    await writeArtifact(submissionId, ARTIFACT_NAME, JSON.stringify(pkg, null, 2));

    return NextResponse.json({ completed });
  } catch (err) {
    console.error("Failed to update section status:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
