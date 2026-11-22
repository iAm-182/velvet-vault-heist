// The Velvet Vault — guard patrols, vision cones, suspicion and the chase.
// A guard walks their waypoints, watches a cone ahead of them, and gets
// suspicious when the thief crosses it in the open. Suspicion fills, the guard
// calls it in (alarm up) and chases; lose them and they go back to patrol.
import {
  GUARD, THIEF, angleDifference, angleTo, clamp, resolveCircle, segmentHitsRect,
} from './config.js';

export const GUARD_STATE = { PATROL: 'patrol', SUSPICIOUS: 'suspicious', CHASE: 'chase', INVESTIGATE: 'investigate' };

export class Guard {
  constructor(def) {
    this.id = def.id;
    this.name = def.name;
    this.x = def.x;
    this.y = def.y;
    this.waypoints = def.waypoints;
    this.waypointIndex = 1;
    this.angle = angleTo(def.x, def.y, def.waypoints[1][0], def.waypoints[1][1]);
    this.state = GUARD_STATE.PATROL;
    this.suspicion = 0;
    this.chaseTimer = 0;
    this.investigateTarget = null;
    this.investigateTimer = 0;
    this.returning = false;
    this.lastSeenX = def.x;
    this.lastSeenY = def.y;
    this.bustedCooldown = 0;
  }

  /** Can this guard see the thief right now? Cone + range + line of sight. */
  canSee(thief, solids, inSmoke, inVent) {
    if (inVent || inSmoke) return false;
    const dx = thief.x - this.x;
    const dy = thief.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance > GUARD.coneRange) return false;
    const toThief = Math.atan2(dy, dx);
    if (Math.abs(angleDifference(toThief, this.angle)) > GUARD.coneHalfAngle) return false;
    for (const solid of solids) {
      if (segmentHitsRect(this.x, this.y, thief.x, thief.y, solid)) return false;
    }
    return true;
  }

  /** One simulation step. Returns 'spotted' the moment suspicion fills. */
  step(dt, thief, solids, inSmoke, inVent, blind = false) {
    const seen = blind ? false : this.canSee(thief, solids, inSmoke, inVent);
    if (seen) {
      this.lastSeenX = thief.x;
      this.lastSeenY = thief.y;
      const rate = GUARD.spotRate * (thief.sneaking ? THIEF.sneakSpotFactor : 1);
      this.suspicion = clamp(this.suspicion + rate * dt, 0, 1);
      if (this.suspicion >= 1 && this.state !== GUARD_STATE.CHASE) {
        this.state = GUARD_STATE.CHASE;
        this.chaseTimer = GUARD.chaseSeconds;
        return 'spotted';
      }
    } else {
      this.suspicion = clamp(this.suspicion - GUARD.forgetRate * dt, 0, 1);
    }

    if (this.state === GUARD_STATE.CHASE) {
      this.chaseTimer -= dt;
      this.moveToward(this.lastSeenX, this.lastSeenY, GUARD.chaseSpeed, dt, solids);
      this.angle = angleTo(this.x, this.y, this.lastSeenX, this.lastSeenY);
      if (this.chaseTimer <= 0) {
        this.state = GUARD_STATE.PATROL;
        this.suspicion = 0.4;
      }
      return null;
    }

    if (this.state === GUARD_STATE.INVESTIGATE && this.investigateTarget) {
      const [tx, ty] = this.investigateTarget;
      const arrived = this.moveToward(tx, ty, GUARD.patrolSpeed * 1.25, dt, solids);
      this.angle = angleTo(this.x, this.y, tx, ty);
      if (arrived) {
        this.investigateTimer -= dt;
        this.angle += dt * 1.8; // look around the spot
        if (this.investigateTimer <= 0) {
          this.state = GUARD_STATE.PATROL;
          this.investigateTarget = null;
        }
      }
      return null;
    }

    // Patrol: walk the waypoints, facing where we walk.
    const [wx, wy] = this.waypoints[this.waypointIndex];
    const arrived = this.moveToward(wx, wy, GUARD.patrolSpeed, dt, solids);
    this.angle = angleTo(this.x, this.y, wx, wy);
    if (arrived) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
    }
    return null;
  }

  /** A decoy coin clinked nearby: go and look at it. */
  investigate(x, y) {
    if (this.state === GUARD_STATE.CHASE) return;
    this.state = GUARD_STATE.INVESTIGATE;
    this.investigateTarget = [x, y];
    this.investigateTimer = 4;
    this.suspicion = Math.max(0, this.suspicion - 0.3);
  }

  /** Step toward (tx,ty), sliding along walls. Returns true when arrived. */
  moveToward(tx, ty, speed, dt, solids) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 6) return true;
    const step = Math.min(distance, speed * dt);
    const nx = this.x + (dx / distance) * step;
    const ny = this.y + (dy / distance) * step;
    const placed = resolveCircle(nx, ny, GUARD.radius, solids);
    this.x = placed.x;
    this.y = placed.y;
    return Math.hypot(tx - this.x, ty - this.y) < 6;
  }
}
