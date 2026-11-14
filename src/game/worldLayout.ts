import { AabbBox, InteractableDef, InventoryItem, ItemId } from './types';

export const ITEM_CATALOG: Record<ItemId, InventoryItem> = {
  assignment_note: {
    id: 'assignment_note',
    name: 'CS-301 Assignment',
    description: "Maduka's graded folder from his office desk. Triggered the lockdown.",
  },
  breaker_fuse: {
    id: 'breaker_fuse',
    name: 'Ceramic Fuse (30A)',
    description: 'Fits the Lecture Hall A-104 auxiliary breaker box.',
  },
  rear_exit_key: {
    id: 'rear_exit_key',
    name: 'Rear Exit Key',
    description: 'Brass key unlocking the Chapter 1 rear corridor door.',
  },
  merit_dossier: {
    id: 'merit_dossier',
    name: 'Project Merit Memo',
    description: 'Confidential Blackwood evaluation file grading you as Rank C.',
  },
  battery_pack: {
    id: 'battery_pack',
    name: 'Alkaline Cell',
    description: 'Restores +45% flashlight battery charge.',
  },
};

export const WORLD_BOUNDS = {
  minX: -11.5,
  maxX: 11.5,
  minZ: -12.5,
  maxZ: 12.5,
};

export const PLAYER_SPAWN = {
  x: 0,
  z: 5.8,
  yaw: 0, // Facing -Z (straight down center aisle toward front podium)
};

export const MADUKA_SPAWN = {
  x: -3.2,
  z: -6.2,
  yaw: Math.PI, // Facing +Z toward hall
};

export const LEVEL_COLLIDERS: AabbBox[] = [
  // Outer structural walls (Leave doorway gaps only via door colliders)
  { id: 'wall_north', minX: -12, maxX: 12, minZ: -13, maxZ: -12.1, height: 4.8, kind: 'wall' },
  { id: 'wall_south_left', minX: -12, maxX: -1.35, minZ: 12.1, maxZ: 13, height: 4.8, kind: 'wall' },
  { id: 'wall_south_right', minX: 1.35, maxX: 12, minZ: 12.1, maxZ: 13, height: 4.8, kind: 'wall' },
  { id: 'wall_west', minX: -12.5, maxX: -11.6, minZ: -13, maxZ: 13, height: 4.8, kind: 'wall' },
  { id: 'wall_east', minX: 11.6, maxX: 12.5, minZ: -13, maxZ: 13, height: 4.8, kind: 'wall' },

  // Locked Rear Exit Door (South center)
  { id: 'door_rear_exit', minX: -1.35, maxX: 1.35, minZ: 12.05, maxZ: 12.45, height: 3.0, kind: 'door_locked' },

  // Maduka's Office Partition (North-East alcove with open doorway at x = 4.2..6.6)
  { id: 'office_divider_left', minX: 3.6, maxX: 4.1, minZ: -12.1, maxZ: -7.0, height: 4.2, kind: 'wall' },
  { id: 'office_front_left', minX: 3.6, maxX: 5.8, minZ: -7.2, maxZ: -6.7, height: 4.2, kind: 'wall' },
  { id: 'office_front_right', minX: 8.6, maxX: 11.6, minZ: -7.2, maxZ: -6.7, height: 4.2, kind: 'wall' },
  { id: 'office_desk', minX: 6.4, maxX: 9.2, minZ: -10.8, maxZ: -9.3, height: 0.95, kind: 'desk' },

  // Front Lectern Podium
  { id: 'front_lectern', minX: -1.2, maxX: 1.2, minZ: -9.4, maxZ: -8.2, height: 1.15, kind: 'desk' },

  // 3 Rows of Oak Student Desks (Left & Right wings, leaving 3.2m center aisle & 2.2m side aisles)
  { id: 'desk_l1', minX: -8.8, maxX: -2.0, minZ: -4.8, maxZ: -3.8, height: 0.95, kind: 'desk' },
  { id: 'desk_r1', minX: 2.0, maxX: 8.8, minZ: -4.8, maxZ: -3.8, height: 0.95, kind: 'desk' },

  { id: 'desk_l2', minX: -8.8, maxX: -2.0, minZ: -0.6, maxZ: 0.4, height: 0.95, kind: 'desk' },
  { id: 'desk_r2', minX: 2.0, maxX: 8.8, minZ: -0.6, maxZ: 0.4, height: 0.95, kind: 'desk' },

  { id: 'desk_l3', minX: -8.8, maxX: -2.0, minZ: 3.8, maxZ: 4.8, height: 0.95, kind: 'desk' },
  { id: 'desk_r3', minX: 2.0, maxX: 8.8, minZ: 3.8, maxZ: 4.8, height: 0.95, kind: 'desk' },

  // Prep / Storage Alcove Pillars & Lockers (West & South-West)
  { id: 'pillar_nw', minX: -7.5, maxX: -6.3, minZ: -9.5, maxZ: -8.3, height: 4.8, kind: 'pillar' },
  { id: 'locker_west_1', minX: -11.5, maxX: -10.3, minZ: -2.2, maxZ: -0.8, height: 2.2, kind: 'locker' },
  { id: 'locker_west_2', minX: -11.5, maxX: -10.3, minZ: 5.5, maxZ: 6.9, height: 2.2, kind: 'locker' },
  { id: 'locker_east_1', minX: 10.3, maxX: 11.5, minZ: 2.0, maxZ: 3.4, height: 2.2, kind: 'locker' },
];

export const INITIAL_INTERACTABLES: InteractableDef[] = [
  {
    id: 'pickup_assignment',
    kind: 'office_desk',
    label: "Collect Maduka's Assignment Folder",
    x: 7.8,
    y: 1.0,
    z: -10.0,
    radius: 2.5,
    itemId: 'assignment_note',
  },
  {
    id: 'pickup_fuse',
    kind: 'pickup',
    label: 'Pick up 30A Ceramic Fuse',
    x: -8.5,
    y: 0.9,
    z: -10.4,
    radius: 2.2,
    itemId: 'breaker_fuse',
  },
  {
    id: 'pickup_merit_memo',
    kind: 'npc_note',
    label: 'Inspect Project Merit Dossier',
    x: -5.4,
    y: 0.92,
    z: -4.3,
    radius: 2.1,
    itemId: 'merit_dossier',
  },
  {
    id: 'pickup_rear_key',
    kind: 'pickup',
    label: 'Take Rear Exit Key from Lectern',
    x: 0.0,
    y: 1.18,
    z: -8.8,
    radius: 2.3,
    itemId: 'rear_exit_key',
  },
  {
    id: 'pickup_battery_1',
    kind: 'pickup',
    label: 'Pick up Flashlight Battery',
    x: 6.2,
    y: 0.92,
    z: 4.3,
    radius: 2.1,
    itemId: 'battery_pack',
  },
  {
    id: 'breaker_panel',
    kind: 'breaker',
    label: 'Auxiliary Electrical Breaker',
    x: -11.4,
    y: 1.4,
    z: -6.2,
    radius: 2.4,
  },
  {
    id: 'locker_1',
    kind: 'locker',
    label: 'Storage Locker (West Front)',
    x: -9.8,
    y: 1.1,
    z: -1.5,
    radius: 2.1,
  },
  {
    id: 'locker_2',
    kind: 'locker',
    label: 'Storage Locker (West Rear)',
    x: -9.8,
    y: 1.1,
    z: 6.2,
    radius: 2.1,
  },
  {
    id: 'locker_3',
    kind: 'locker',
    label: 'Storage Locker (East Rear)',
    x: 9.8,
    y: 1.1,
    z: 2.7,
    radius: 2.1,
  },
  {
    id: 'rear_exit_door',
    kind: 'exit_door',
    label: 'Rear Corridor Exit Door',
    x: 0.0,
    y: 1.4,
    z: 11.7,
    radius: 2.5,
  },
];

export function resolvePlayerCollision(
  x: number,
  z: number,
  radius: number,
  colliders: AabbBox[],
  ignoreIds?: Set<string>,
): { x: number; z: number } {
  let px = Math.min(Math.max(x, WORLD_BOUNDS.minX + radius), WORLD_BOUNDS.maxX - radius);
  let pz = Math.min(Math.max(z, WORLD_BOUNDS.minZ + radius), WORLD_BOUNDS.maxZ - radius);

  for (const box of colliders) {
    if (ignoreIds?.has(box.id)) continue;

    const closestX = Math.max(box.minX, Math.min(px, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(pz, box.maxZ));

    const dx = px - closestX;
    const dz = pz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      if (distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const push = radius - dist;
        px += (dx / dist) * push;
        pz += (dz / dist) * push;
      } else {
        // Inside AABB: push out along shallowest axis
        const leftPen = Math.abs(px - box.minX);
        const rightPen = Math.abs(box.maxX - px);
        const topPen = Math.abs(pz - box.minZ);
        const botPen = Math.abs(box.maxZ - pz);
        const minPen = Math.min(leftPen, rightPen, topPen, botPen);
        if (minPen === leftPen) px = box.minX - radius;
        else if (minPen === rightPen) px = box.maxX + radius;
        else if (minPen === topPen) pz = box.minZ - radius;
        else pz = box.maxZ + radius;
      }
    }
  }

  return { x: px, z: pz };
}

function segmentIntersectsAabb2D(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  box: AabbBox,
): boolean {
  let tmin = 0;
  let tmax = 1;
  const dx = bx - ax;
  const dz = bz - az;

  if (Math.abs(dx) < 1e-8) {
    if (ax < box.minX || ax > box.maxX) return false;
  } else {
    const invD = 1 / dx;
    let t1 = (box.minX - ax) * invD;
    let t2 = (box.maxX - ax) * invD;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }

  if (Math.abs(dz) < 1e-8) {
    if (az < box.minZ || az > box.maxZ) return false;
  } else {
    const invD = 1 / dz;
    let t1 = (box.minZ - az) * invD;
    let t2 = (box.maxZ - az) * invD;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }

  return true;
}

/**
 * Raycasts 2D line of sight from Maduka to Player against walls, pillars, lockers,
 * and (when player is crouched) oak desk modesty panels.
 * Guarantees Maduka NEVER sees through walls or low desk cover while crouched.
 */
export function hasLineOfSight(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  playerCrouching: boolean,
  colliders: AabbBox[] = LEVEL_COLLIDERS,
): boolean {
  for (const box of colliders) {
    if (box.kind === 'desk' && !playerCrouching) {
      // Standing players are visible above 0.95m desks
      continue;
    }
    if (segmentIntersectsAabb2D(ax, az, bx, bz, box)) {
      return false;
    }
  }
  return true;
}
