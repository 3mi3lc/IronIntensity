import {BodyPart} from "@/repositories/types";
import {db} from "@/db/client";
import {body_parts} from "@/db/schema";


export async function getAllBodyParts():Promise<BodyPart[]> {
    return db.select().from(body_parts);
}

// For upserting body parts from remote (pull operation)
export async function upsertBodyPartFromRemote(bodyPart: BodyPart): Promise<boolean> {
    try {
        await db.insert(body_parts)
            .values({
                id: bodyPart.id,
                name: bodyPart.name,
            })
            .onConflictDoUpdate({
                target: body_parts.id,
                set: {
                    name: bodyPart.name,
                }
            });
        return true;
    } catch (error) {
        console.error('Failed to upsert body part:', error);
        return false;
    }
}

// Batch upsert body parts from remote
export async function upsertBodyPartsFromRemote(bodyPartsData: BodyPart[]): Promise<boolean> {
    if (bodyPartsData.length === 0) return true;

    try {
        for (const bodyPart of bodyPartsData) {
            const success = await upsertBodyPartFromRemote(bodyPart);
            if (!success) return false;
        }
        return true;
    } catch (error) {
        console.error('Failed to batch upsert body parts:', error);
        return false;
    }
}