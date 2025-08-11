import {BodyPart} from "@/repositories/types";
import {db} from "@/db/client";
import {body_parts} from "@/db/schema";
import {eq} from "drizzle-orm";


export async function getAllBodyParts():Promise<BodyPart[]> {
    return db.select().from(body_parts);
}

export async function getBodyPartById(id: string):Promise<BodyPart> {
    const [bodyPart] = await db.select()
        .from(body_parts)
        .where(eq(body_parts.id, id));

    return bodyPart ?? null;
}