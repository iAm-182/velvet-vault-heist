// The Velvet Vault — the thief's tools. Each costs a charge, and the loud ones
// cost alarm too: smoke blinds every cone it covers, EMP kills the cameras for
// a while (but its buzz feeds the alarm), and a decoy coin pulls a guard over
// to look at it.
import { TOOLS } from './config.js';

export class Toolbelt {
  constructor() {
    this.smoke = TOOLS.smoke.charges;
    this.emp = TOOLS.emp.charges;
    this.decoy = TOOLS.decoy.charges;
    this.smokes = []; // {x, y, radius, timeLeft}
    this.decoys = []; // {x, y, timeLeft}
    this.empTimeLeft = 0;
  }

  /** A smoke cloud at (x,y), or null when out of charges. */
  throwSmoke(x, y) {
    if (this.smoke <= 0) return null;
    this.smoke -= 1;
    const cloud = { x, y, radius: TOOLS.smoke.radius, timeLeft: TOOLS.smoke.seconds };
    this.smokes.push(cloud);
    return cloud;
  }

  /** EMP burst: returns the seconds the cameras stay dead, or 0 when empty. */
  fireEmp() {
    if (this.emp <= 0) return 0;
    this.emp -= 1;
    this.empTimeLeft = TOOLS.emp.seconds;
    return TOOLS.emp.seconds;
  }

  /** A decoy coin at (x,y), or null when out of charges. */
  throwDecoy(x, y) {
    if (this.decoy <= 0) return null;
    this.decoy -= 1;
    const coin = { x, y, timeLeft: TOOLS.decoy.investigateSeconds + 1 };
    this.decoys.push(coin);
    return coin;
  }

  /** Is the thief standing inside any live smoke cloud? */
  thiefInSmoke(x, y) {
    for (const cloud of this.smokes) {
      if (Math.hypot(x - cloud.x, y - cloud.y) < cloud.radius) return true;
    }
    return false;
  }

  step(dt) {
    for (const cloud of this.smokes) cloud.timeLeft -= dt;
    this.smokes = this.smokes.filter((c) => c.timeLeft > 0);
    for (const coin of this.decoys) coin.timeLeft -= dt;
    this.decoys = this.decoys.filter((c) => c.timeLeft > 0);
    if (this.empTimeLeft > 0) this.empTimeLeft -= dt;
  }
}
