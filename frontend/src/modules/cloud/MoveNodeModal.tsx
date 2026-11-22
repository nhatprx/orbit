import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import { errorMessage } from '../../services/workspace/httpClient';
import { cloudScopeKey, type CloudBreadcrumbItem, type CloudNodeDto, type CloudScope } from '../../types/cloud.types';
import type { CloudLocationOption } from './cloudLocations';
import { MoveBrowserPanes } from './MoveBrowserPanes';

interface MoveNodeModalProps {
  nodes: CloudNodeDto[];
  sourceScope: CloudScope;
  locations: CloudLocationOption[];
  apiForScope: (scope: CloudScope) => CloudFilesApi;
  onClose: () => void;
  onMove: (targetScope: CloudScope, targetParentId: string | null) => Promise<void>;
}

export function MoveNodeModal({
  nodes,
  sourceScope,
  locations,
  apiForScope,
  onClose,
  onMove,
}: MoveNodeModalProps) {
  const open = nodes.length > 0;
  const movingIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);

  const [targetScope, setTargetScope] = useState<CloudScope>(sourceScope);
  const [browseParentId, setBrowseParentId] = useState<string | null>(null);
  const [trail, setTrail] = useState<CloudBreadcrumbItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<CloudNodeDto | null>(null);
  const [folders, setFolders] = useState<CloudNodeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetScopeKey = cloudScopeKey(targetScope);
  const activeLocation = locations.find((l) => l.key === targetScopeKey) ?? locations[0];

  useEffect(() => {
    if (!open) return;
    const defaultLoc =
      locations.find((l) => l.key === cloudScopeKey(sourceScope) && l.canWrite) ??
      locations.find((l) => l.canWrite) ??
      locations[0];
    setTargetScope(defaultLoc ? defaultLoc.scope : sourceScope);
    setBrowseParentId(null);
    setTrail([]);
    setSelectedFolder(null);
    setError(null);
  }, [open, sourceScope, locations]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);
    apiForScope(targetScope)
      .listNodes({ parentId: browseParentId, view: 'ALL', sortBy: 'name', sortDir: 'asc', limit: 100 })
      .then((res) => {
        if (!active) return;
        setFolders(res.items.filter((item) => item.nodeType === 'FOLDER' && !movingIds.has(item.id)));
      })
      .catch((err) => {
        if (active) setError(errorMessage(err, 'Failed to load destination folders.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [open, targetScopeKey, browseParentId, apiForScope, targetScope, movingIds]);

  if (!open) return null;

  const destinationParentId = selectedFolder ? selectedFolder.id : browseParentId;
  const destinationPath = [
    activeLocation?.label ?? 'Root',
    ...trail.map((t) => t.name),
    ...(selectedFolder ? [selectedFolder.name] : []),
  ].join(' / ');

  const selectLocation = (loc: CloudLocationOption) => {
    if (!loc.canWrite) return;
    setTargetScope(loc.scope);
    setBrowseParentId(null);
    setTrail([]);
    setSelectedFolder(null);
    setError(null);
  };

  const drillInto = (folder: CloudNodeDto) => {
    setBrowseParentId(folder.id);
    setTrail((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSelectedFolder(null);
  };

  const goUp = () => {
    if (trail.length === 0) return;
    const next = trail.slice(0, -1);
    setTrail(next);
    setBrowseParentId(next[next.length - 1]?.id ?? null);
    setSelectedFolder(null);
  };

  const jumpToTrail = (index: number) => {
    const next = index < 0 ? [] : trail.slice(0, index + 1);
    setTrail(next);
    setBrowseParentId(next[next.length - 1]?.id ?? null);
    setSelectedFolder(null);
  };

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onMove(targetScope, destinationParentId);
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Failed to move selected items.'));
    } finally {
      setSubmitting(false);
    }
  }

  const title = nodes.length === 1 ? `Move "${nodes[0]?.name ?? ''}"` : `Move ${nodes.length} Items`;

  return (
    <Modal open size="lg" title={title} subtitle="Choose a destination location and folder" onClose={onClose}>
      <div className="space-y-3">
        <MoveBrowserPanes
          locations={locations}
          activeKey={targetScopeKey}
          activeLabel={activeLocation?.label ?? 'Root'}
          trail={trail}
          folders={folders}
          selectedFolderId={selectedFolder?.id ?? null}
          loading={loading}
          onSelectLocation={selectLocation}
          onGoUp={goUp}
          onJumpTrail={jumpToTrail}
          onPickFolder={(f) => setSelectedFolder(selectedFolder?.id === f.id ? null : f)}
          onDrillFolder={drillInto}
        />

        <div className="border border-[#30363D] bg-[#0D1117] px-3 py-2 font-mono text-xs text-[#8B949E]">
          Destination: <span className="text-[#22C55E]">{destinationPath}</span>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" disabled={submitting} onClick={() => void handleConfirm()}>
            {submitting ? 'Moving...' : nodes.length > 1 ? `Move ${nodes.length} Items` : 'Move Here'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
