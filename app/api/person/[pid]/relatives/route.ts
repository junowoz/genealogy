import { NextResponse } from "next/server";
import { getFamilySearchContext } from "../../../../../src/lib/familysearch/client";
import {
  encodeFamilySearchId,
  normalizeFamilySearchId,
} from "../../../../../src/lib/familysearch/ids";

export async function GET(_req: Request, ctx: any) {
  const pid: string = ctx?.params?.pid;

  if (!pid) {
    return NextResponse.json({ error: "missing_pid" }, { status: 400 });
  }

  try {
    const normalizedPid = normalizeFamilySearchId(pid);
    const { client } = await getFamilySearchContext();
    const data = await client.get<any>(
      `/platform/tree/persons/${encodeFamilySearchId(normalizedPid)}?relatives=true`
    );

    const relationships = data?.relationships ?? [];
    const persons = data?.persons ?? [];
    const personsMap = new Map(persons.map((p: any) => [p.id, p]));

    const parents: any[] = [];
    const spouses: any[] = [];
    const children: any[] = [];

    for (const rel of relationships) {
      const type = rel?.type;

      // Child-and-Parents relationship
      if (type?.includes("ChildAndParentsRelationship")) {
        const childId = rel.child?.resourceId;
        const parent1Id = rel.parent1?.resourceId;
        const parent2Id = rel.parent2?.resourceId;

        if (childId === normalizedPid) {
          // This person is the child, add parents
          if (parent1Id) {
            const parent = personsMap.get(parent1Id);
            if (parent) parents.push(parent);
          }
          if (parent2Id) {
            const parent = personsMap.get(parent2Id);
            if (parent) parents.push(parent);
          }
        } else {
          // This person is a parent, add child
          if (childId) {
            const child = personsMap.get(childId);
            if (child) children.push(child);
          }
        }
      }

      // Couple relationship
      if (type?.includes("Couple")) {
        const person1Id = rel.person1?.resourceId;
        const person2Id = rel.person2?.resourceId;

        if (person1Id === normalizedPid && person2Id) {
          const spouse = personsMap.get(person2Id);
          if (spouse) spouses.push(spouse);
        } else if (person2Id === normalizedPid && person1Id) {
          const spouse = personsMap.get(person1Id);
          if (spouse) spouses.push(spouse);
        }
      }
    }

    return NextResponse.json({
      parents: parents.filter(Boolean),
      spouses: spouses.filter(Boolean),
      children: children.filter(Boolean),
    });
  } catch (err: any) {
    if (err.message?.includes("Unauthorized") || err.message?.includes("401")) {
      return NextResponse.json(
        { error: "auth_required", message: "Login necessário" },
        { status: 401 }
      );
    }

    if (err.message?.includes("404") || err.message?.includes("not found")) {
      return NextResponse.json({ error: "person_not_found" }, { status: 404 });
    }
    if (err.message === "invalid_familysearch_id") {
      return NextResponse.json({ error: "invalid_pid" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "familysearch_error", message: err.message },
      { status: 502 }
    );
  }
}
