/**
 * Type definitions for the Kni engine.
 */

import type {Expression} from './grammar-types';
import type Engine from './engine';

/**
 * A story state node representing an instruction in the story.
 */
export interface StoryState {
  type: string;
  label?: string;
  next?: string;
  branch?: string;
  question?: string[];
  answer?: string[];
  keywords?: string[];
  branches?: string[];
  weights?: Expression[];
  variable?: string;
  value?: number;
  cue?: string;
  mode?: string;
  text?: string;
  lift?: string;
  drop?: string;
  expression?: Expression;
  condition?: Expression;
  source?: Expression;
  target?: Expression;
  args?: Expression[];
  locals?: string[];
  position?: string;
}

/**
 * A collection of story states indexed by label.
 */
export type States = Record<string, StoryState>;

/**
 * Random number generator interface.
 * Compatible with Math.random() and xorshift.
 */
export interface Randomer {
  random(): number;
  _state0U?: number;
  _state0L?: number;
  _state1U?: number;
  _state1L?: number;
}

/**
 * Renderer interface for displaying story content.
 */
export interface Render {
  write(lift: string, text: string, drop: string): void;
  break(): void;
  paragraph(): void;
  startOption(): void;
  stopOption(): void;
  display(): void;
  clear(): void;
  flush(): void;
  pardon(): void;
}

/**
 * Dialog interface for user interaction.
 */
export interface Dialog {
  engine?: Engine;
  ask(cue?: string): void;
  close(): void;
  meterFault(): void;
}

/**
 * Handler interface for customizing engine behavior.
 */
export interface Handler {
  has?(name: string): boolean;
  get?(name: string): any;
  set?(name: string, value: any): void;
  changed?(name: string, value: any): void;
  goto?(label: string, state?: StoryState): void;
  end?(engine: Engine): void;
  close?(engine: Engine): void;
  ask?(engine: Engine): void;
  answer?(text: string, engine: Engine): void;
  choice?(option: StoryState, engine: Engine): void;
  waypoint?(waypoint: any, engine: Engine): void;
  cue?(cue: string, next: string, engine: Engine): boolean;
}

/**
 * Arguments for constructing an Engine.
 */
export interface EngineArgs {
  story: States;
  start?: string;
  handler?: Handler;
  render: Render;
  dialog: Dialog;
  randomer?: Randomer;
}
