import { describe, expect, it, vi } from 'vitest';
import type { ProjectDto } from '../types/workspace.types';
import { page, project, setup, workspace } from './controllerTestKit';
import { INITIAL_WORKSPACE_STATE } from './workspaceStore';

describe('workspace and project mutations', () => {
  it('creates a workspace and makes it active', async () => {
    const created = workspace('new');
    const list = [workspace('a')];
    const { store, controller } = setup({
      workspaces: list,
      workspaceService: {
        createWorkspace: vi.fn(async () => { list.push(created); return created; }),
      },
    });
    await controller.bootstrap('u1');

    const result = await controller.createWorkspace({ name: 'New', moduleKeys: ['git'] });

    expect(result.id).toBe('new');
    expect(store.getState().activeWorkspaceId).toBe('new');
    expect(store.getState().workspaces.map((w) => w.id)).toEqual(['a', 'new']);
  });

  it('creates a project in the active workspace and selects it', async () => {
    const projectsByWs: Record<string, ProjectDto[]> = { a: [] };
    const { store, controller } = setup({
      workspaces: [workspace('a')],
      projects: projectsByWs,
      projectService: {
        listProjects: async () => page(projectsByWs.a ?? []),
        createProject: async (workspaceId, request) => {
          const created = project('p-new', workspaceId);
          projectsByWs.a = [{ ...created, name: request.name }];
          return created;
        },
      },
    });
    await controller.bootstrap('u1');

    const created = await controller.createProject({ name: 'Delta' });

    expect(created.id).toBe('p-new');
    expect(store.getState().activeProjectId).toBe('p-new');
  });

  it('refuses to create a project without an active workspace', async () => {
    const { controller } = setup({ workspaces: [] });
    await controller.bootstrap('u1');
    await expect(controller.createProject({ name: 'X' })).rejects.toThrow('Select a workspace first.');
  });

  it('moves to another workspace when the active one disappears on refresh', async () => {
    const list = [workspace('a'), workspace('b')];
    const { store, controller } = setup({ workspaces: list });
    await controller.bootstrap('u1');
    list.shift();

    await controller.refreshWorkspaces();

    expect(store.getState().activeWorkspaceId).toBe('b');
  });

  it('keeps the selected project when the project list refreshes', async () => {
    const { store, controller } = setup({ workspaces: [workspace('a')], projects: { a: [project('p1', 'a')] } });
    await controller.bootstrap('u1');
    controller.selectProject('p1');

    await controller.refreshProjects();

    expect(store.getState().activeProjectId).toBe('p1');
  });

  it('drops the selected project if it vanishes after a refresh', async () => {
    const projectsByWs: Record<string, ProjectDto[]> = { a: [project('p1', 'a')] };
    const { store, controller } = setup({ workspaces: [workspace('a')], projects: projectsByWs });
    await controller.bootstrap('u1');
    controller.selectProject('p1');
    projectsByWs.a = [];

    await controller.refreshProjects();

    expect(store.getState().activeProjectId).toBeNull();
  });

  it('resets everything on sign-out', async () => {
    const { store, controller } = setup({ workspaces: [workspace('a')] });
    await controller.bootstrap('u1');
    controller.reset();
    expect(store.getState()).toEqual(INITIAL_WORKSPACE_STATE);
  });
});
