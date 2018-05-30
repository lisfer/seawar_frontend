import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';


const SEA = {EMPTY:0, SHIP:10, BORDER:1, MISSED: -1, HIT: -10};
const SIGNALS = {HIT:2, MISSED:3, KILLED:5, WIN:5};
const SERVER = 'http://localhost:5000';

class Cell extends React.Component {

    render () {

        let className = 'cell';
        if (this.props.value === SEA.SHIP) className += ' cellShipUser';
        if (this.props.value === SEA.BORDER) className += ' cellBorder';
        if (this.props.value === SEA.MISSED) className += ' cellMissed';
        if (this.props.value === SEA.HIT) className += ' cellHit';
        return (
            <div className={className} onClick={this.props.clickHandler}>&nbsp;</div>
        )
    }
}

class SeaField extends React.Component {

    createMatrix(max_x, max_y) {
        /*
        creates Array [max_y][max_y]
        where every element is a Object{x, y, is_ship, is_border} keys
         */
        return Array.from(
                {length: max_y},
                (v, i) => Array.from(
                    {length: max_x},
                    (v, j) => ({x: j, y: i, value: SEA.EMPTY})));
    }

    set_many(cells_update) {
        let state_cells = this.state.cells;
        cells_update.map((el) => (state_cells[el.y][el.x].value = el.value));
        this.setState({cells: state_cells});
    }

    constructor(props) {
        super(props);
        this.state = {
            max_x: this.props.max_x,
            max_y: this.props.max_y,
            cells: this.createMatrix(this.props.max_x, this.props.max_y)
        };
        this.initShips();
    }

    initShips () {}

    renderCells () {

        return this.state.cells.map(
            (row, y) => (
                <div key={y}>
                    {row.map(
                        (el, x) => <Cell key={`${y}_${x}`} x={x} y={y} value={el.value}/>)}
                </div>));
    }

    render () {

        let cells = this.renderCells();

        return (
            <div className ="seaField">{cells}</div>
        )
    }
}


class SeaFieldUser extends SeaField {

    initShips() {
        let self = this;
        fetch(SERVER + '/api/init_user_ship', {method: 'POST', credentials: 'include'})
            .then(
                (resp) => {if (!resp.ok) throw Error(resp.statusText); return resp.json()})
            .then(
                (data) => self.set_many(data.filter((el) => el.value === SEA.SHIP)))
            .catch((err) => console.log(err));
    }
}


class SeaFieldComp extends SeaField {

    constructor(props) {
        super(props);
        this.state['frozen'] = false;
    }

    initShips() {
        fetch(SERVER + '/api/init_enemy_ship', {method: 'POST', credentials: 'include'})
            .then((resp) => {if (!resp.ok) throw Error(resp.statusText); return resp.json()})
            .catch((err) => console.log(err));
    }

    cellClick(x, y) {
        let self = this;
        if (self.state.frozen) return;
        let data = new FormData();
        data.append('x', x);
        data.append('y', y);
        fetch(SERVER + '/api/user_shoot', {method: 'POST', body: data, credentials: 'include'})
            .then((resp) => {if (!resp.ok) throw Error(resp.statusText); return resp.json()})
            .then((data) => {
                self.set_many(data.cells.map((el) => {return el}));
                self.set_many(data.border.map((el) => {el.value = el.value === SEA.EMPTY ? SEA.BORDER : el.value; return el}));
            })
            .catch((err) => console.log(err))
            .finally(() => self.setState({frozen: false}));

        self.setState({frozen: true});
    }

    renderCells () {
        return this.state.cells.map(
            (row, y) => (
                <div key={y}>
                    {row.map(
                        (el, x) => <Cell key={`${y}_${x}`} clickHandler={() => this.cellClick(x, y)}
                                         x={x} y={y} value={el.value}/>)}
                </div>));
    }
}


ReactDOM.render(
    <div>
        <SeaFieldUser max_x={10} max_y={10}/>
        <SeaFieldComp max_x={10} max_y={10}/>
    </div>,
  document.getElementById('root')
);
