import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { projects, attributes, issues, mitigations } from '../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { COMPASS_ATTRIBUTES } from '../../../shared/types';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

const router = Router();

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userProjects = await db.query.projects.findMany({
      where: eq(projects.userId, req.session.userId!)
    });
    res.json(userProjects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, goalStatement } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const [project] = await db.insert(projects).values({
      userId: req.session.userId!,
      name,
      description: description || '',
      goalStatement: goalStatement || '',
      decision: 'pending'
    }).returning();

    const attributeData = COMPASS_ATTRIBUTES.map((attr, index) => ({
      projectId: project.id,
      code: attr.code,
      name: attr.name,
      description: attr.description,
      status: 'pending' as const,
      order: index
    }));

    await db.insert(attributes).values(attributeData);

    res.json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, parseInt(req.params.id)),
        eq(projects.userId, req.session.userId!)
      )
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectAttributes = await db.query.attributes.findMany({
      where: eq(attributes.projectId, project.id),
      orderBy: [asc(attributes.order)]
    });

    const attributesWithIssues = await Promise.all(
      projectAttributes.map(async (attr) => {
        const attrIssues = await db.query.issues.findMany({
          where: eq(issues.attributeId, attr.id)
        });

        const issuesWithMitigations = await Promise.all(
          attrIssues.map(async (issue) => {
            const issueMitigations = await db.query.mitigations.findMany({
              where: eq(mitigations.issueId, issue.id)
            });
            return { ...issue, mitigations: issueMitigations };
          })
        );

        return { ...attr, issues: issuesWithMitigations };
      })
    );

    res.json({ ...project, attributes: attributesWithIssues });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, goalStatement, decision } = req.body;
    
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, parseInt(req.params.id)),
        eq(projects.userId, req.session.userId!)
      )
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [updated] = await db.update(projects)
      .set({
        name: name ?? project.name,
        description: description ?? project.description,
        goalStatement: goalStatement ?? project.goalStatement,
        decision: decision ?? project.decision,
        updatedAt: new Date()
      })
      .where(eq(projects.id, project.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, parseInt(req.params.id)),
        eq(projects.userId, req.session.userId!)
      )
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await db.delete(projects).where(eq(projects.id, project.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

router.put('/:id/attributes/:attrId', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    
    const attr = await db.query.attributes.findFirst({
      where: eq(attributes.id, parseInt(req.params.attrId))
    });

    if (!attr) {
      return res.status(404).json({ error: 'Attribute not found' });
    }

    const [updated] = await db.update(attributes)
      .set({ status: status ?? attr.status })
      .where(eq(attributes.id, attr.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Update attribute error:', error);
    res.status(500).json({ error: 'Failed to update attribute' });
  }
});

router.post('/:id/attributes/:attrId/issues', async (req: Request, res: Response) => {
  try {
    const { title, description, score, status } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Issue title is required' });
    }

    const [issue] = await db.insert(issues).values({
      attributeId: parseInt(req.params.attrId),
      title,
      description: description || '',
      score: score ?? 50,
      status: status || 'pending'
    }).returning();

    await updateAttributeStatus(parseInt(req.params.attrId));

    res.json(issue);
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

router.put('/:id/issues/:issueId', async (req: Request, res: Response) => {
  try {
    const { title, description, score, status } = req.body;
    
    const issue = await db.query.issues.findFirst({
      where: eq(issues.id, parseInt(req.params.issueId))
    });

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const [updated] = await db.update(issues)
      .set({
        title: title ?? issue.title,
        description: description ?? issue.description,
        score: score ?? issue.score,
        status: status ?? issue.status,
        updatedAt: new Date()
      })
      .where(eq(issues.id, issue.id))
      .returning();

    await updateAttributeStatus(issue.attributeId);

    res.json(updated);
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

router.delete('/:id/issues/:issueId', async (req: Request, res: Response) => {
  try {
    const issue = await db.query.issues.findFirst({
      where: eq(issues.id, parseInt(req.params.issueId))
    });

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const attributeId = issue.attributeId;
    await db.delete(issues).where(eq(issues.id, issue.id));
    await updateAttributeStatus(attributeId);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({ error: 'Failed to delete issue' });
  }
});

router.post('/:id/issues/:issueId/mitigations', async (req: Request, res: Response) => {
  try {
    const { description, owner, deadline } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Mitigation description is required' });
    }

    const [mitigation] = await db.insert(mitigations).values({
      issueId: parseInt(req.params.issueId),
      description,
      owner: owner || '',
      deadline: deadline || null,
      completed: false
    }).returning();

    res.json(mitigation);
  } catch (error) {
    console.error('Create mitigation error:', error);
    res.status(500).json({ error: 'Failed to create mitigation' });
  }
});

router.put('/:id/mitigations/:mitId', async (req: Request, res: Response) => {
  try {
    const { description, owner, deadline, completed } = req.body;
    
    const mitigation = await db.query.mitigations.findFirst({
      where: eq(mitigations.id, parseInt(req.params.mitId))
    });

    if (!mitigation) {
      return res.status(404).json({ error: 'Mitigation not found' });
    }

    const [updated] = await db.update(mitigations)
      .set({
        description: description ?? mitigation.description,
        owner: owner ?? mitigation.owner,
        deadline: deadline !== undefined ? deadline : mitigation.deadline,
        completed: completed ?? mitigation.completed
      })
      .where(eq(mitigations.id, mitigation.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Update mitigation error:', error);
    res.status(500).json({ error: 'Failed to update mitigation' });
  }
});

router.delete('/:id/mitigations/:mitId', async (req: Request, res: Response) => {
  try {
    await db.delete(mitigations).where(eq(mitigations.id, parseInt(req.params.mitId)));
    res.json({ success: true });
  } catch (error) {
    console.error('Delete mitigation error:', error);
    res.status(500).json({ error: 'Failed to delete mitigation' });
  }
});

async function updateAttributeStatus(attributeId: number) {
  const attrIssues = await db.query.issues.findMany({
    where: eq(issues.attributeId, attributeId)
  });

  if (attrIssues.length === 0) {
    await db.update(attributes)
      .set({ status: 'pending' })
      .where(eq(attributes.id, attributeId));
    return;
  }

  const hasRed = attrIssues.some(i => i.status === 'red');
  const hasYellow = attrIssues.some(i => i.status === 'yellow');
  const allGreen = attrIssues.every(i => i.status === 'green');

  let newStatus: 'green' | 'yellow' | 'red' | 'pending' = 'pending';
  if (hasRed) newStatus = 'red';
  else if (hasYellow) newStatus = 'yellow';
  else if (allGreen) newStatus = 'green';

  await db.update(attributes)
    .set({ status: newStatus })
    .where(eq(attributes.id, attributeId));
}

router.post('/:id/calculate-decision', async (req: Request, res: Response) => {
  try {
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, parseInt(req.params.id)),
        eq(projects.userId, req.session.userId!)
      )
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectAttributes = await db.query.attributes.findMany({
      where: eq(attributes.projectId, project.id)
    });

    const hasRed = projectAttributes.some(a => a.status === 'red');
    const hasYellow = projectAttributes.some(a => a.status === 'yellow');
    const hasPending = projectAttributes.some(a => a.status === 'pending');
    const allGreen = projectAttributes.every(a => a.status === 'green');

    let decision: 'go' | 'fix' | 'pause' | 'pending' = 'pending';
    if (hasRed) decision = 'pause';
    else if (hasYellow) decision = 'fix';
    else if (allGreen) decision = 'go';
    else if (hasPending) decision = 'pending';

    const [updated] = await db.update(projects)
      .set({ decision, updatedAt: new Date() })
      .where(eq(projects.id, project.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Calculate decision error:', error);
    res.status(500).json({ error: 'Failed to calculate decision' });
  }
});

export default router;
