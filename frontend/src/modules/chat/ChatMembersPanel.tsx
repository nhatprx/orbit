import { useMemo } from 'react';
import { Monitor, Volume2 } from 'lucide-react';
import type { ChatChannelDto, MemberDto, VoiceParticipantDto } from '../../types/workspace.types';
import { initialsOf } from '../../utils/format';

interface ChatMembersPanelProps {
  members: MemberDto[];
  loading: boolean;
  channels: ChatChannelDto[];
  participantsByChannel: Record<string, VoiceParticipantDto[]>;
}

interface VoiceMemberItem {
  userId: string;
  displayName: string;
  username: string;
  channelName: string;
  speaking: boolean;
  screenSharing: boolean;
}

function isAdminRole(member: MemberDto): boolean {
  if (member.isOwner) return true;
  const role = member.roleName.toLowerCase();
  return role.includes('owner') || role.includes('admin');
}

export function ChatMembersPanel({
  members,
  loading,
  channels,
  participantsByChannel,
}: ChatMembersPanelProps) {
  const { inVoice, ownersAdmins, regularMembers } = useMemo(() => {
    const channelNames = new Map(channels.map((c) => [c.id, c.name]));
    const voiceMap = new Map<string, VoiceMemberItem>();

    for (const [channelId, list] of Object.entries(participantsByChannel)) {
      const channelName = channelNames.get(channelId) ?? 'voice';
      for (const participant of list) {
        voiceMap.set(participant.userId, {
          userId: participant.userId,
          displayName: participant.displayName,
          username: participant.username,
          channelName,
          speaking: participant.speaking,
          screenSharing: participant.screenSharing,
        });
      }
    }

    const admins: MemberDto[] = [];
    const others: MemberDto[] = [];
    for (const member of members) {
      if (voiceMap.has(member.userId)) continue;
      if (isAdminRole(member)) admins.push(member);
      else others.push(member);
    }

    return {
      inVoice: [...voiceMap.values()],
      ownersAdmins: admins,
      regularMembers: others,
    };
  }, [channels, members, participantsByChannel]);

  return (
    <aside
      aria-label="Members panel"
      className="flex w-60 shrink-0 flex-col border-l border-[#30363D] bg-[#161B22]"
    >
      <div className="flex items-center justify-between border-b border-[#30363D] px-3 py-3">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#E6EDF3]">
          MEMBERS
        </h3>
        <span className="border border-[#30363D] bg-[#21262D] px-1.5 py-0.5 font-mono text-[10px] text-[#BDBDBD]">
          {members.length}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {inVoice.length > 0 && (
          <section>
            <h4 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#22C55E]">
              IN VOICE ({inVoice.length})
            </h4>
            <div className="space-y-2">
              {inVoice.map((item) => (
                <div key={item.userId} className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center border font-mono text-[11px] font-semibold ${
                      item.speaking
                        ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
                        : 'border-[#3B434B] bg-[#0D1117] text-[#E6EDF3]'
                    }`}
                  >
                    {initialsOf(item.displayName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium text-[#E6EDF3]">
                        {item.displayName}
                      </span>
                      {item.screenSharing && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 border border-[#22C55E] bg-[#052E16] px-1 font-mono text-[9px] font-semibold text-[#4ADE80]">
                          <Monitor className="h-2.5 w-2.5" strokeWidth={1.5} />
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[10px] text-[#22C55E]">
                      <Volume2 className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{item.channelName}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading && members.length === 0 ? (
          <p className="font-mono text-xs text-[#8A8A8A]">Loading members...</p>
        ) : (
          <>
            {ownersAdmins.length > 0 && (
              <MemberGroup title={`OWNERS & ADMINS (${ownersAdmins.length})`} members={ownersAdmins} />
            )}
            {regularMembers.length > 0 && (
              <MemberGroup title={`MEMBERS (${regularMembers.length})`} members={regularMembers} />
            )}
            {members.length === 0 && inVoice.length === 0 && (
              <p className="text-xs text-[#8A8A8A]">No members visible in this scope.</p>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function MemberGroup({ title, members }: { title: string; members: MemberDto[] }) {
  return (
    <section>
      <h4 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
        {title}
      </h4>
      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.userId} className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#3B434B] bg-[#0D1117] font-mono text-[11px] font-semibold text-[#BDBDBD]">
              {initialsOf(member.displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[#E6EDF3]">{member.displayName}</p>
              <p className="truncate font-mono text-[10px] text-[#8A8A8A]">
                @{member.username} - {member.isOwner ? 'Owner' : member.roleName}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
