"use client";

import { useEffect, useState, useCallback } from "react";

interface Member {
  id: string;
  trip_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  invited_by: string | null;
  joined_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

interface ShareLink {
  id: string;
  trip_id: string;
  slug: string;
  allow_suggestions: boolean;
  expires_at: string | null;
  created_at: string;
}

interface Props {
  tripId: string;
  currentUserId: string;
  isOwner: boolean;
}

const ROLE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  owner: { bg: "bg-sand-900", text: "text-white", label: "Owner" },
  editor: { bg: "bg-ocean/10", text: "text-ocean", label: "Editor" },
  viewer: { bg: "bg-sand-100", text: "text-sand-600", label: "Viewer" },
};

export function SharePageClient({ tripId, currentUserId, isOwner }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchMembers = useCallback(async () => {
    const res = await fetch(`/api/trips/${tripId}/members`);
    const data = await res.json();
    if (res.ok) setMembers(data.members);
  }, [tripId]);

  const fetchShareLink = useCallback(async () => {
    const res = await fetch(`/api/trips/${tripId}/share-link`);
    const data = await res.json();
    if (res.ok) setShareLink(data.link);
  }, [tripId]);

  useEffect(() => {
    fetchMembers();
    fetchShareLink();
  }, [fetchMembers, fetchShareLink]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch(`/api/trips/${tripId}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Failed to invite");
    } else {
      setSuccess(`Invited ${inviteEmail} as ${inviteRole}!`);
      setInviteEmail("");
      fetchMembers();
    }
    setLoading(false);
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Remove this member from the trip?")) return;
    const res = await fetch(`/api/trips/${tripId}/members/${memberId}`, { method: "DELETE" });
    if (res.ok) fetchMembers();
  }

  async function handleChangeRole(memberId: string, newRole: "editor" | "viewer") {
    const res = await fetch(`/api/trips/${tripId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) fetchMembers();
  }

  async function handleGenerateLink() {
    const res = await fetch(`/api/trips/${tripId}/share-link`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setShareLink(data.link);
  }

  async function handleDeleteLink() {
    if (!confirm("Disable the share link?")) return;
    const res = await fetch(`/api/trips/${tripId}/share-link`, { method: "DELETE" });
    if (res.ok) setShareLink(null);
  }

  async function handleToggleSuggestions() {
    if (!shareLink) return;
    const res = await fetch(`/api/trips/${tripId}/share-link`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ allow_suggestions: !shareLink.allow_suggestions }),
    });
    const data = await res.json();
    if (res.ok) setShareLink(data.link);
  }

  function copyLink() {
    if (!shareLink) return;
    const url = `${window.location.origin}/shared/${shareLink.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getInitials(name: string | null | undefined) {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <>
      {/* Invite section */}
      <div className="card p-6 mb-6 animate-slide-up">
        <h3 className="font-display text-lg font-semibold mb-4">Invite People</h3>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="friend@email.com"
            className="input flex-1"
            required
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
            className="input w-32"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button type="submit" disabled={loading} className="btn-primary whitespace-nowrap">
            {loading ? "Sending..." : "Send Invite"}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        {success && <p className="text-sm text-emerald-600 mt-3">{success}</p>}
      </div>

      {/* Share link section */}
      <div className="card p-6 mb-6 animate-slide-up stagger-1">
        <h3 className="font-display text-lg font-semibold mb-4">Share Link</h3>
        {shareLink ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="input flex-1 bg-sand-50 text-sand-600 font-mono text-sm flex items-center overflow-hidden">
                {window.location.origin}/shared/{shareLink.slug}
              </div>
              <button onClick={copyLink} className="btn-primary whitespace-nowrap">
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-sand-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareLink.allow_suggestions}
                  onChange={handleToggleSuggestions}
                  className="rounded border-sand-300"
                />
                Allow viewers to add suggestions
              </label>
              {isOwner && (
                <button
                  onClick={handleDeleteLink}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Disable link
                </button>
              )}
            </div>
          </div>
        ) : (
          <button onClick={handleGenerateLink} className="btn-primary">
            Generate Share Link
          </button>
        )}
      </div>

      {/* Members list */}
      <div className="card p-6 animate-slide-up stagger-2">
        <h3 className="font-display text-lg font-semibold mb-4">
          Trip Members ({members.length})
        </h3>
        <div className="flex flex-col gap-3">
          {members.map((m) => {
            const badge = ROLE_BADGE[m.role] ?? ROLE_BADGE.viewer;
            const isMe = m.user_id === currentUserId;
            const canManage = isOwner && m.role !== "owner";
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-sand-50/50 hover:bg-sand-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-sand-200 flex items-center justify-center text-sm font-semibold text-sand-600 shrink-0">
                  {getInitials(m.profile?.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sand-900 truncate">
                    {m.profile?.full_name ?? "Unknown"}{" "}
                    {isMe && <span className="text-sand-400 font-normal">(you)</span>}
                  </p>
                  <p className="text-xs text-sand-400 truncate">
                    {m.profile?.email ?? ""}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                >
                  {badge.label}
                </span>
                {canManage && (
                  <div className="flex items-center gap-1 ml-2">
                    <select
                      value={m.role}
                      onChange={(e) =>
                        handleChangeRole(m.id, e.target.value as "editor" | "viewer")
                      }
                      className="text-xs border border-sand-200 rounded-lg px-2 py-1 bg-white"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="text-red-400 hover:text-red-600 text-xs px-1"
                      title="Remove member"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {members.length === 0 && (
            <p className="text-sand-400 text-sm">Loading members...</p>
          )}
        </div>
      </div>
    </>
  );
}
