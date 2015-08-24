import React, {PropTypes, Component} from 'react';

import pureRender from 'pure-render-decorator';

import propTypes from './propTypes';

@pureRender
class Bar extends Component {

  static propTypes = {
    // TODO: rename
    valueFrom: PropTypes.number,

    // TODO: rename
    valueTo: PropTypes.number,

    // index of this bar
    i: PropTypes.number,

    // crrently selected index
    index: PropTypes.number,

    min: propTypes.min,
    max: propTypes.max,
    barClassName: propTypes.barClassName,
  }

  static contextTypes = {
    _posMinKey: PropTypes.func,
    _posMaxKey: PropTypes.func,
  }

  render() {
    const {valueFrom, valueTo, i, barClassName, min, max} = this.props;

    // console.log(`Render bar ${i}`);

    const className = `${barClassName} ${barClassName}-${i}`;
    const style = this._buildBarStyle(valueFrom + min, max - valueTo);

    return (
      <div
        className={className}
        style={style}
        />
    );
  }

    // TODO: rename valueFrom, valueTo
  _buildBarStyle = (valueFrom, valueTo) => {
    const {index, min, max} = this.props;
    const {_posMinKey, _posMaxKey} = this.context;

    const posMinKey = _posMinKey();
    const posMaxKey = _posMaxKey();

    const posMin = valueFrom / (max - min) * 100;
    const posMax = valueTo / (max - min) * 100;

    return {
      position: 'absolute',
      willChange: index >= 0 ? `${posMinKey}, ${posMaxKey}` : '',
      [posMinKey]: `${posMin}%`,
      [posMaxKey]: `${posMax}%`,
    };
  }
}

export default Bar;
