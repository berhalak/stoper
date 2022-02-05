import fs from 'fs';
import path from 'path';
import os from 'os';
import {pack, Packer, PackerLogger} from 'packer-js';
import {DateTime, Duration} from 'luxon';

PackerLogger.debug = false;

const file = path.join(os.homedir(), '.stoper');

function save(json: any) {
  fs.writeFileSync(file, Packer.serialize(json));
}

function read<T>(): T | null {
  if (!fs.existsSync(file)) return null;
  return Packer.deserialize<T>(fs.readFileSync(file).toString());
}

@pack()
class Timestamp {
  public timestamp = DateTime.now().toMillis();
}

@pack()
class Started extends Timestamp {}

@pack()
class Stopped extends Timestamp {}

@pack()
class StoperIsActive {
  toString() {
    return "Stoper was already started";
  }
}

@pack()
class StoperIsNotActive {
  toString() {
    return "Stoper was not started";
  }
}

@pack()
class Stoper {
  public history: Timestamp[] = [];
  private active = false;
  private current = 0;
  private last = 0;
  constructor(public name: string = '') {
    this.history = read() || [];
    for (const entry of this.history) {
      this.apply(entry);
    }
  }

  public start() {
    if (this.active) {
      throw new StoperIsActive();
    }
    this.history.push(this.apply(new Started()));
    save(this.history);
  }

  public toString() {
    let log = '';
    if (this.active) {
      log += 'Time: ' + Duration.fromMillis(DateTime.now().toMillis() - this.current).toFormat('hh:mm:ss');
    } else {
      log += 'Last:' + Duration.fromMillis(this.last).toFormat('hh:mm:ss');;
    }
    return log;
  }

  public stop() {
    if (!this.active) {
      throw new StoperIsNotActive();
    }
    this.history.push(this.apply(new Stopped()));
    save(this.history);
  }

  private apply(entry: Timestamp) {
    if (entry instanceof Started) {
      this.active = true;
      this.current = entry.timestamp;
    } else if (entry instanceof Stopped) {
      this.active = false;
      this.last = entry.timestamp - this.current;
      this.current = 0;
    }
    return entry;
  }
}

let current = new Stoper();

export function main(args: any[]) {
  try {
    if (args[0] === 'start') {
      current.start();
      console.log('Started at ' + DateTime.now().toLocaleString());
    } else if (args[0] === 'stop') {
      current.stop();
      console.log(current.toString());
      console.log('Stopped at ' + DateTime.now().toLocaleString());
    } else {
      console.log(current.toString());
    }
  } catch (err) {
    console.log(err.toString());
  }
}
