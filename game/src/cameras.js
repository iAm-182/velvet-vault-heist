// The Velvet Vault — wall cameras: a sweeping red cone, a lock-on, and a trip
// that feeds the alarm meter. EMP kills them for a while; smoke blinds them.
import {
  CAMERA, angleDifference, clamp, segmentHitsRect,
} from './config.js';

export class Camera {
  constructor(def) {
    this.id = def.id;
    this.label = def.label;
    this.x = def.x;
    this.y = def.y;
    this.baseAngle = def.baseAngle;
    this.angle = def.baseAngle;
    this.sweepPhase = Math.random() * Math.PI * 2;
    this.lock = 0; // 0..1, fills while the thief is in the cone
    this.cooldown = 0; // seconds left after a trip
    this.disabled = 0; // seconds left of EMP
    this.trippedFlash = 0;
  }

  /** Can this camera see the thief right now? */
  canSee(thief, solids, inSmoke, inVent) {
    if (this.disabled > 0 || this.cooldown > 0) return false;
    if (inVent || inSmoke) return false;
    const dx = thief.x - this.x;
    const dy = thief.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance > CAMERA.coneRange) return false;
    const toThief = Math.atan2(dy, dx);
    if (Math.abs(angleDifference(toThief, this.angle)) > CAMERA.coneHalfAngle) return false;
    for (const solid of solids) {
      if (segmentHitsRect(this.x, this.y, thief.x, thief.y, solid)) return false;
    }
    return true;
  }

  /** One simulation step. Returns 'tripped' when the lock fills. */
  step(dt, thief, solids, inSmoke, inVent, blind = false) {
    if (this.disabled > 0) this.disabled -= dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.trippedFlash > 0) this.trippedFlash -= dt;
    // Sweep back and forth around the base angle while it is live.
    if (this.disabled <= 0) {
      this.sweepPhase += dt * CAMERA.sweepSpeed;
      this.angle = this.baseAngle + Math.sin(this.sweepPhase) * CAMERA.sweepHalfAngle;
    }
    if (!blind && this.canSee(thief, solids, inSmoke, inVent)) {
      this.lock = clamp(this.lock + CAMERA.spotRate * dt, 0, 1);
      if (this.lock >= 1) {
        this.lock = 0;
        this.cooldown = CAMERA.tripCooldownSeconds;
        this.trippedFlash = 1.2;
        return 'tripped';
      }
    } else {
      this.lock = clamp(this.lock - 0.6 * dt, 0, 1);
    }
    return null;
  }
}
