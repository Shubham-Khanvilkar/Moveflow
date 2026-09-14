// ============================================================
// TRIP LIFECYCLE STATE MACHINE
// ============================================================
// Enforces valid state transitions for the complete trip lifecycle.
// Invalid transitions are rejected at the service layer.

export type TripState =
  // Normal flow
  | 'SCHEDULED'
  | 'DISPATCHED'
  | 'DRIVER_ACCEPTED'
  | 'EN_ROUTE_TO_PICKUP'
  | 'ARRIVED_AT_PICKUP'
  | 'BOARDING'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_DROP'
  | 'COMPLETED'
  // Exception states
  | 'DELAYED'
  | 'CANCELLED'
  | 'BREAKDOWN_REPORTED'
  | 'REPLACEMENT_SEARCH'
  | 'REPLACEMENT_ASSIGNED'
  | 'REPLACEMENT_EN_ROUTE'
  | 'PASSENGER_TRANSFER_IN_PROGRESS'
  | 'TRIP_RESUMED'
  // No-show
  | 'NO_SHOW';

export type TripAction =
  | 'DISPATCH'
  | 'DRIVER_ACCEPT'
  | 'DRIVER_DECLINE'
  | 'DRIVER_EN_ROUTE'
  | 'ARRIVE_AT_PICKUP'
  | 'START_BOARDING'
  | 'PASSENGER_BOARDED'
  | 'START_TRIP'
  | 'ARRIVE_AT_DROP'
  | 'COMPLETE_TRIP'
  | 'CANCEL'
  | 'REPORT_BREAKDOWN'
  | 'FIND_REPLACEMENT'
  | 'ASSIGN_REPLACEMENT'
  | 'REPLACEMENT_EN_ROUTE'
  | 'REPLACEMENT_ARRIVE'
  | 'TRANSFER_PASSENGERS'
  | 'RESUME_TRIP'
  | 'MARK_NO_SHOW'
  | 'REPORT_DELAY';

// Valid state transitions
const VALID_TRANSITIONS: Record<TripState, TripAction[]> = {
  SCHEDULED: ['DISPATCH', 'CANCEL'],
  DISPATCHED: ['DRIVER_ACCEPT', 'DRIVER_DECLINE', 'CANCEL'],
  DRIVER_ACCEPTED: ['DRIVER_EN_ROUTE', 'REPORT_BREAKDOWN', 'CANCEL'],
  EN_ROUTE_TO_PICKUP: ['ARRIVE_AT_PICKUP', 'REPORT_BREAKDOWN', 'REPORT_DELAY', 'CANCEL'],
  ARRIVED_AT_PICKUP: ['START_BOARDING', 'MARK_NO_SHOW', 'REPORT_BREAKDOWN', 'CANCEL'],
  BOARDING: ['START_TRIP', 'MARK_NO_SHOW', 'REPORT_BREAKDOWN', 'CANCEL'],
  IN_TRANSIT: ['ARRIVE_AT_DROP', 'REPORT_BREAKDOWN', 'REPORT_DELAY', 'CANCEL'],
  ARRIVED_AT_DROP: ['COMPLETE_TRIP', 'REPORT_BREAKDOWN'],
  COMPLETED: [], // Terminal state
  DELAYED: ['ARRIVE_AT_PICKUP', 'START_TRIP', 'ARRIVE_AT_DROP', 'REPORT_BREAKDOWN', 'CANCEL'],
  CANCELLED: [], // Terminal state
  BREAKDOWN_REPORTED: ['FIND_REPLACEMENT', 'CANCEL'],
  REPLACEMENT_SEARCH: ['ASSIGN_REPLACEMENT', 'CANCEL'],
  REPLACEMENT_ASSIGNED: ['REPLACEMENT_EN_ROUTE', 'CANCEL'],
  REPLACEMENT_EN_ROUTE: ['REPLACEMENT_ARRIVE', 'CANCEL'],
  PASSENGER_TRANSFER_IN_PROGRESS: ['RESUME_TRIP'],
  TRIP_RESUMED: ['ARRIVE_AT_DROP', 'REPORT_BREAKDOWN'],
  NO_SHOW: [], // Terminal state
};

// What state an action leads to
const ACTION_TARGET_STATE: Record<TripAction, TripState> = {
  DISPATCH: 'DISPATCHED',
  DRIVER_ACCEPT: 'DRIVER_ACCEPTED',
  DRIVER_DECLINE: 'SCHEDULED', // Goes back to scheduled for re-dispatch
  DRIVER_EN_ROUTE: 'EN_ROUTE_TO_PICKUP',
  ARRIVE_AT_PICKUP: 'ARRIVED_AT_PICKUP',
  START_BOARDING: 'BOARDING',
  PASSENGER_BOARDED: 'BOARDING', // Stays in boarding
  START_TRIP: 'IN_TRANSIT',
  ARRIVE_AT_DROP: 'ARRIVED_AT_DROP',
  COMPLETE_TRIP: 'COMPLETED',
  CANCEL: 'CANCELLED',
  REPORT_BREAKDOWN: 'BREAKDOWN_REPORTED',
  FIND_REPLACEMENT: 'REPLACEMENT_SEARCH',
  ASSIGN_REPLACEMENT: 'REPLACEMENT_ASSIGNED',
  REPLACEMENT_EN_ROUTE: 'REPLACEMENT_EN_ROUTE',
  REPLACEMENT_ARRIVE: 'PASSENGER_TRANSFER_IN_PROGRESS',
  TRANSFER_PASSENGERS: 'PASSENGER_TRANSFER_IN_PROGRESS',
  RESUME_TRIP: 'TRIP_RESUMED',
  MARK_NO_SHOW: 'NO_SHOW',
  REPORT_DELAY: 'DELAYED',
};

export class TripStateMachine {
  /**
   * Check if a transition is valid
   */
  static canTransition(currentState: TripState, action: TripAction): boolean {
    const validActions = VALID_TRANSITIONS[currentState];
    return validActions ? validActions.includes(action) : false;
  }

  /**
   * Execute a transition, returning the new state
   * Throws if transition is invalid
   */
  static transition(currentState: TripState, action: TripAction): TripState {
    if (!this.canTransition(currentState, action)) {
      const validActions = VALID_TRANSITIONS[currentState] || [];
      throw new Error(
        `Invalid transition: ${currentState} + ${action}. ` +
        `Valid actions from ${currentState}: [${validActions.join(', ')}]`
      );
    }
    return ACTION_TARGET_STATE[action];
  }

  /**
   * Get all valid actions from a given state
   */
  static getValidActions(state: TripState): TripAction[] {
    return VALID_TRANSITIONS[state] || [];
  }

  /**
   * Check if a state is terminal (no further transitions)
   */
  static isTerminal(state: TripState): boolean {
    const actions = VALID_TRANSITIONS[state];
    return !actions || actions.length === 0;
  }

  /**
   * Get valid target states from a given state
   */
  static getReachableStates(state: TripState): TripState[] {
    const actions = VALID_TRANSITIONS[state] || [];
    return [...new Set(actions.map((a) => ACTION_TARGET_STATE[a]))];
  }
}
