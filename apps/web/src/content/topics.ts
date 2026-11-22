import type { ExplanationContent } from "@aie/engine";

/**
 * Explanations written at three levels. The engine picks the level; people write the words.
 * The optional AI route rewrites these source texts and never sees anything about the reader.
 */
export const TOPICS = {
  replication: {
    expert:
      "Writes commit on a 2-of-3 quorum across zones; reads go to the leader. One zone down: fully available. Two down: read-only until quorum returns.",
    standard:
      "Every record is stored on three servers in different zones. A change is saved once two of them confirm it. If one zone fails, the other two keep working. If two fail, you can still read data, but you can't change it until a second server is back.",
    simplified:
      "Your data is kept in three copies, in three separate buildings. Saving waits until at least two copies have the change. If one building has a problem, you won't notice. If two have a problem at once, you can still look at your data, but you can't change it until one comes back.",
  },
  failover: {
    expert:
      "Leader lease is 10 s. On expiry, the most up-to-date follower is promoted; in-flight writes without quorum are rejected and must be retried by the client.",
    standard:
      "One server leads and the others follow. If the leader stops answering for 10 seconds, the follower with the newest data takes over. Changes that were not confirmed yet are rejected, so your app should try them again.",
    simplified:
      "One copy is in charge. If it goes quiet for 10 seconds, another copy takes over automatically. Anything that was being saved at that exact moment is turned away, so the app simply tries again.",
  },
  backups: {
    expert:
      "Continuous WAL archiving with 5-minute snapshots, retained 7 days; point-in-time restore to any second in that window.",
    standard:
      "Changes are archived continuously and a full snapshot is taken every 5 minutes. Backups are kept for 7 days, and you can restore the data to any second in that period.",
    simplified:
      "Every change is also written to a safe archive, and a full copy is made every 5 minutes. You can go back to how things were at any moment in the last 7 days.",
  },
  decommission: {
    expert:
      "Drains traffic, deletes 3 services and 1.2 TB of volumes, removes 14 alert rules. Snapshots are retained 7 days; the cluster object itself is not recoverable.",
    standard:
      "Traffic stops, the 3 services and their 1.2 TB of data are deleted, and 14 alerts are removed. Backups stay for 7 days, but the cluster can't be brought back. You would have to build a new one and restore into it.",
    simplified:
      "This switches the cluster off for good. The 3 services on it stop, and their data is erased. A backup is kept for 7 days, but this exact cluster can never be turned back on.",
  },
} satisfies ExplanationContent;

export type TopicId = keyof typeof TOPICS;

export const TOPIC_TITLES: Record<TopicId, string> = {
  replication: "How your data is replicated",
  failover: "What happens when a server fails",
  backups: "How backups work",
  decommission: "What decommissioning does",
};
