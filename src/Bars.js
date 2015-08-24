import React, {PropTypes, Component} from 'react';
import shouldPureComponentUpdate from 'react-pure-render/function';

import propTypes from './propTypes';
import Bar from './Bar';

class Bars extends Component {

  shouldComponentUpdate = shouldPureComponentUpdate

  static propTypes = {
    index: PropTypes.number,

    value: propTypes.value,
    min: propTypes.min,
    max: propTypes.max,
    barClassName: propTypes.barClassName,
  }

  render() {
    const {value, min, max} = this.props;

    const lastIndex = value.length - 1;

    const firstBar = this._renderBar(0, min, value[0]);
    const lastBar = this._renderBar(lastIndex + 1, value[lastIndex], max);

    const bars = value
      .filter((v, i) => i !== lastIndex)
      .map((v, i) => this._renderBar(i + 1, v, value[i + 1]));

    return (
      <span>
        {[firstBar, ...bars, lastBar]}
      </span>
    );
  }

  _renderBar = (i, valueFrom, valueTo) => {
    const {index, min, max, barClassName} = this.props;

    return (
      <Bar
        key={`bar-${i}`}
        valueFrom={valueFrom}
        valueTo={valueTo}
        i={i}
        index={index}
        min={min}
        max={max}
        barClassName={barClassName}
        />
    );
  }
}

export default Bars;
