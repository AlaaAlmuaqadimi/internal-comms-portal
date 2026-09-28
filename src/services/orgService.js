const { readJson } = require('./dataService');

/**
 * Organisational hierarchy loaded from data/org.json (edit that file to change the structure).
 * Node kinds: root | deputy | office | directorate | section | group.
 * "group" nodes are only visual categories (e.g. "regional directorates"): nobody sits in
 * them, and they are skipped when looking for a unit's manager or path.
 */
const root = readJson('org.json');
const byId = new Map();

(function index(node, parent) {
  node.parent = parent ? parent.id : null;
  node.children = node.children || [];
  byId.set(node.id, node);
  node.children.forEach((child) => index(child, node));
})(root, null);

const get = (id) => byId.get(String(id)) || null;
const isGroup = (n) => n.kind === 'group';
const isSelectable = (id) => {
  const n = get(id);
  return !!n && !isGroup(n);
};

/** Chain root → … → unit. */
function ancestors(id) {
  const chain = [];
  for (let n = get(id); n; n = n.parent ? get(n.parent) : null) chain.unshift(n);
  return chain;
}

/** Nearest ancestor-or-self that is an office/directorate/deputy/root (the "إدارة/مكتب" level). */
function managementOf(id) {
  const chain = ancestors(id).reverse();
  return chain.find((n) => ['root', 'deputy', 'office', 'directorate'].includes(n.kind)) || chain[0];
}

function describe(id) {
  const n = get(id);
  if (!n) return { unitName: '', management: '', section: '', path: '' };
  return {
    unitName: n.name,
    management: managementOf(id).name,
    section: n.kind === 'section' ? n.name : '',
    path: ancestors(id).filter((a) => !isGroup(a)).map((a) => a.name).join(' › '),
  };
}

function descendantIds(node) {
  return node.children.flatMap((c) => [c.id, ...descendantIds(c)]);
}

/** Direct manager unit = nearest non-group ancestor. */
function managerUnit(id) {
  const chain = ancestors(id);
  for (let i = chain.length - 2; i >= 0; i--) if (!isGroup(chain[i])) return chain[i];
  return null;
}

/**
 * Units related to `id`:
 *  - below:   every unit underneath it (at any depth)
 *  - same:    the unit itself + sibling units under the same parent (same administrative level)
 *  - manager: the direct manager unit
 */
function relatives(id) {
  const node = get(id);
  const same = new Set([node.id]);
  if (node.parent) get(node.parent).children.forEach((c) => same.add(c.id));
  const manager = managerUnit(id);
  return { below: new Set(descendantIds(node)), same, manager: new Set(manager ? [manager.id] : []) };
}

/** Grouped options for the <select> shown when creating an account. */
function unitOptions() {
  const nbsp = '\u00A0\u00A0';
  const walk = (node, depth, out) => {
    out.push({ id: node.id, label: nbsp.repeat(depth) + node.name });
    node.children.filter((c) => !isGroup(c)).forEach((c) => walk(c, depth + 1, out));
  };
  const top = [];
  walk(root, 0, top);
  const groups = [{ label: 'القيادة العليا والإدارات المباشرة', items: top }];
  root.children.filter(isGroup).forEach((g) => {
    const items = [];
    g.children.forEach((c) => walk(c, 0, items));
    groups.push({ label: g.name, items });
  });
  return groups;
}

module.exports = { get, isSelectable, describe, relatives, unitOptions };
