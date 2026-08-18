import { followUpsService } from "@/services/followUpsService";
import { associatesService } from "@/services/associatesService";
import FollowUpsBoard from "@/components/follow-ups/FollowUpsBoard";

export default async function FollowUpsPage() {
  const [followUps, associates] = await Promise.all([followUpsService.getAll(), associatesService.getAll()]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink-950">Follow-ups</h1>
        <p className="mt-1 text-sm text-ink-700/65">Stay on top of every scheduled callback and reminder.</p>
      </div>
      <FollowUpsBoard followUps={followUps} associates={associates} />
    </div>
  );
}
