import React, {PropTypes, Component} from 'react';
import shouldPureComponentUpdate from 'react-pure-render/function';

import propTypes from './propTypes';

class Handle extends Component {

  shouldComponentUpdate = shouldPureComponentUpdate

  static propTypes = {
    v: PropTypes.number,

    // index of this bar
    i: PropTypes.number,

    // crrently selected index
    index: PropTypes.number,

    zIndex: PropTypes.number,

    min: propTypes.min,
    max: propTypes.max,
    handleClassName: propTypes.handleClassName,
    handleActiveClassName: propTypes.handleActiveClassName,
  }

  static contextTypes = {
    _createOnMouseDown: PropTypes.func,
    _createOnTouchStart: PropTypes.func,
    _onFocus: PropTypes.func,
    _onBlur: PropTypes.func,
    _onKeyDown: PropTypes.func,

    _posMinKey: PropTypes.func,
  }

  render() {
    const {i, index, handleClassName, handleActiveClassName, disabled, children} = this.props;
    const {_createOnMouseDown, _createOnTouchStart, _onFocus, _onBlur, _onKeyDown} = this.context;

    // console.log(`Render handle ${i}`);

    const isActive = index === i ? handleActiveClassName : '';
    const className = `${handleClassName} ${handleClassName}-${i} ${isActive}`;

    const style = this._buildHandleStyle();

    return (
      <div
        className={className}
        style={style}
        tabIndex={disabled ? null : '0'}
        onMouseDown={disabled ? null : _createOnMouseDown(i)}
        onTouchStart={disabled ? null : _createOnTouchStart(i)}
        onFocus={disabled ? null : () => _onFocus(i)}
        onBlur={disabled ? null : _onBlur}
        onKeyDown={disabled ? null : _onKeyDown}
        >
        {children}
      </div>
    );
  }

  _buildHandleStyle = () => {
    const {v, min, max, index, zIndex} = this.props;
    const {_posMinKey} = this.context;

    const posMinKey = _posMinKey();
    const offset = v / (max - min) * 100;

    return {
      zIndex,
      position: 'absolute',
      willChange: index >= 0 ? posMinKey : '',
      [posMinKey]: `${offset}%`,
    };
  }
}

export default Handle;
