import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';


class Cell extends React.Component {

    constructor(props) {
        super(props);

        let className = 'cell';
        if (this.props.is_ship) className += ' shipCell';
        if (this.props.is_border) className += ' borderCell';

        this.state = {
            className: className
        }
    }
    render () {
        return (
            <div className={this.state.className}>&nbsp;</div>
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
                    (v, j) => ({x: j, y: i, is_ship: false, is_border: false})));
    }

    constructor(props) {
        super(props);
        this.state = {
            max_x: this.props.max_x,
            max_y: this.props.max_y,
            cells: this.createMatrix(this.props.max_x, this.props.max_y)
        }
    }
    render () {
        let self = this;

        let cells = self.state.cells.map(
            (row, y) =>  (
                <div key={y}>
                    {row.map((el, x) => <Cell key={`${y}_${x}`} x={x} y={y}/>)}
                </div>));

        return (
            <div>{cells}</div>
        )
    }
}


ReactDOM.render(
  <SeaField max_x={10} max_y={10}/>,
  document.getElementById('root')
);
