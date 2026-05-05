class GameRecorder {
    constructor() {
        this.gameID = crypto.randomUUID();
        this.stepCounter = 0;
        this.moves = [];
        this.experiences = [];
        this.startTime = Date.now();
        this.outcome = null;

        // game config 
        this.config = {
            boardWidth: 15,
            boardHeight: 15,
            gridSize: 60,
            keyPositions: [
                { row: 0, col: 0},
                { row: 14, col: 14},
                { row: 7, col: 7}
            ],
            doorPosition: { row: 8, col: 14 }
        };
    }

    /**
     * Records a single move by any entity
     * @param {'human'|'zombie'} entity - who moved
     * @param {'UP'|'DOWN'|'LEFT'|'RIGHT'} action - Direction taken
     * @param {number} fromRow - Starting row.
     * @param {number} fromCol - Starting col. 
     * @param {number} toRow - ending row.
     * @param {number} toCol - ending col. 
     * @param {number} timestamp - Seconds since game start.
     */
    recordMove(entity, action, fromRow, fromCol, toRow, toCol, timestamp){
        this.stepCounter++;
        this.moves.push({
            move_id: this.stepCounter,
            game_id: this.gameID,
            step_number: this.stepCounter,
            entity,
            action,
            from_row: fromRow,
            from_col: fromCol,
            to_row: toRow,
            to_col: toCol,
            timestamp
        });

        // If this is a zombie move, also record and experience tuple for RL training
        if (entity === 'zombie'){
            this.recordZombieExperience(action, fromRow, fromCol, toRow, toCol);
        }
    }

    /**
     * Records a zombie RL epxerience tuple
     * 
     */
    recordZombieExperience(action, fromRow, fromCol, toRow, toCol) {
        // placeholders for state features -- will fine tune with python RL program is written
        const state = this._computeStateFeatures(fromRow, fromCol);
        const nextState = this._computeStateFeatures(toRow, toCol);

        this.experiences.push({
            exp_id: this.experiences.length + 1,
            game_id: this.gameID,
            step_number: this.stepCounter,
            state,
            action: this._actionToIndex(action),
            reward: null, 
            next_state: nextState,
            done: false,
            from_row: fromRow,
            from_col: fromCol,
            to_row: toRow,
            to_col: toCol
        });
    }

    /** Marks a key as collected at the current step */
    recordKeyCollection(keyIndex, row, col) {
        this.moves.push({
            move_id: ++this.stepCounter,
            game_id: this.gameID,
            step_number: this.stepCounter,
            entity: 'event',
            action: 'KEY_COLLECTED',
            key_index: keyIndex,
            row,
            col
        });
    }

    /** Called when athe game ends. Sets the outcome and freezes the record */
    recordGameOver(outcome){
        this.outcome = outcome;
        this.endTime = Date.now();
        this.totalSteps = this.stepCounter;
    }

    /**
     * Returms the complete game session as a JSON-serializable object
     * This is what gets sent to API
     */
    exportSession(){
        return {
            game_id: this.gameID,
            config: this.config,
            start_time: this.startTime,
            end_time: this.endTime,
            outcome: this.outcome,
            total_steps: this.totalSteps,
            moves: this.moves,
            experiences: this.experiences
        };
    }

    _actionToIndex(action){
        const map = {'up': 0, 'right': 1, 'down': 2, 'left': 3 };
        return map[action] ?? -1;
    }

    _computeStateFeatures(row,col) {
        // TODO: compute the 7 state features
        return [row, col];
    }
}

export default GameRecorder;