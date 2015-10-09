import React, {PropTypes, Component} from 'react';
import shouldPureComponentUpdate from 'react-pure-render/function';

import {pauseEvent, stopPropagation} from './common';
import {propTypes} from './props.js';

const SHIFT_MULTIPLIER = 10;

function addHandlers(eventMap) {
  for (let [key, func] of eventMap) {
    document.addEventListener(key, func, false);
  }
}

function removeHandlers(eventMap) {
  for (let [key, func] of eventMap) {
    document.removeEventListener(key, func, false);
  }
}

class Handle extends Component {

  shouldComponentUpdate = shouldPureComponentUpdate

  static propTypes = {
    value: PropTypes.number,
    index: PropTypes.number,

    zIndex: PropTypes.number,

    min: propTypes.min,
    max: propTypes.max,
    handleClassName: propTypes.handleClassName,
    handleActiveClassName: propTypes.handleActiveClassName,
  }

  static contextTypes = {
    invert: PropTypes.bool,
    step: PropTypes.number,

    _start: PropTypes.func,
    _move: PropTypes.func,
    _end: PropTypes.func,

    _measureSlider: PropTypes.func,

    _posMinKey: PropTypes.func,
    _incKey: PropTypes.func,
    _decKey: PropTypes.func,

    _getMousePosition: PropTypes.func,
    _getTouchPosition: PropTypes.func,
  }

  render() {
    const {index, handleClassName, handleActiveClassName, disabled, children, active} = this.props;

    // console.log(`Render handle ${i}`);

    const isActiveClassName = active ? ` ${handleActiveClassName}` : ``;
    const className = `${handleClassName} ${handleClassName}-${index}${isActiveClassName}`;

    const style = this._buildHandleStyle();

    return (
      <div
        className={className}
        style={style}
        tabIndex={disabled ? null : '0'}
        onMouseDown={disabled ? null : this._onMouseDown}
        onTouchStart={disabled ? null : this._onTouchStart}
        onFocus={disabled ? null : this._onFocus}
        onBlur={disabled ? null : this._onBlur}
        onKeyDown={disabled ? null : this._onKeyDown}
        >
        {children}
      </div>
    );
  }

  _buildHandleStyle = () => {
    const {value, min, max, index, zIndex} = this.props;
    const {_posMinKey} = this.context;

    const posMinKey = _posMinKey();
    const offset = value / (max - min) * 100;

    return {
      zIndex,
      position: 'absolute',
      willChange: index >= 0 ? posMinKey : '',
      [posMinKey]: `${offset}%`,
    };
  }

  // start onStart
  _onMouseDown = (e) => {
    const {_getMousePosition} = this.context;
    const [position] = _getMousePosition(e);

    addHandlers(this._mouseEventMap);

    pauseEvent(e);

    this._onStart(position, e);
  }

  _onTouchStart = (e) => {
    const {_getTouchPosition} = this.context;

    // TODO: remove when todo above is implemented
    if (e.touches.length > 1) return;

    const positions = _getTouchPosition(e);
    const [position] = positions;

    this._startPositions = positions;
    this._isScrolling = undefined; // don't know yet if the user is trying to scroll

    addHandlers(this._touchEventMap);

    stopPropagation(e);

    this._onStart(position, e);
  }

  _onStart = (position, e) => {
    if (this.onStart) this.onStart(position, e);
  }
  // end onStart

  // being onMove
  _onMouseMove = (e) => {
    const {_getMousePosition} = this.context;
    const [position] = _getMousePosition(e);
    this._onMove(position);
  }

  _onTouchMove = (e) => {
    const {_getTouchPosition} = this.context;

    // FIXME: find out if "nearest" touch is still there
    if (e.touches.length > 1) return;

    const [positionMainDir, positionScrollDir] = _getTouchPosition(e);
    const [startPositionMainDir, startPositionScrollDir] = this._startPositions;

    if (typeof this._isScrolling === 'undefined') {
      const diffMainDir = positionMainDir - startPositionMainDir;
      const diffScrollDir = positionScrollDir - startPositionScrollDir;
      this._isScrolling = Math.abs(diffScrollDir) > Math.abs(diffMainDir);
    }

    if (this._isScrolling) {
      // this.setState({index: -1});
      return;
    }

    pauseEvent(e);

    this._onMove(positionMainDir, e);
  }

  _onMove = (position, e) => {
    if (this.onMove) this.onMove(position, e);
  }
  // end onMove

  // begin onEnd
  _onMouseUp = (e) => {
    this._onEnd(this._mouseEventMap, e);
  }

  _onTouchEnd = (e) => {
    this._onEnd(this._touchEventMap, e);
  }

  _onEnd = (eventMap, e) => {
    removeHandlers(eventMap);
    if (this.onEnd) this.onEnd(e);
  }
  // end onEnd

  onStart = (position) => {
    const {value, index} = this.props;
    const {_measureSlider, _start} = this.context;

    // TODO: find out if necessary with tabindex
    // if activeElement is body window will lost focus in IE9
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }

    const {sliderLength} = _measureSlider();

    this._startValue = value;
    this._startPosition = position;
    this._sliderLength = sliderLength;

    _start(index);
  }

  onMove = (position) => {
    const {_sliderLength, _startPosition, _startValue} = this;
    const {index, min, max} = this.props;
    const {invert, _move} = this.context;

    let diffPosition = position - _startPosition;

    // FIXME: don't depend on invert (and don't pass via context)
    if (invert) diffPosition *= -1;

    const diffValue = diffPosition / _sliderLength * (max - min);

    _move(index, _startValue + diffValue);
  }

  onEnd = () => {
    const {index} = this.props;
    const {_end} = this.context;

    _end(index);
  }

  _onFocus = () => {
    const {index} = this.props;
    const {_start} = this.context;

    _start(index);
  }

  _onBlur = () => {
    const {index} = this.props;
    const {_end} = this.context;

    _end(index);
  }

  _onKeyDown = ({which, shiftKey}) => {
    const {value, index} = this.props;
    const {step, _incKey, _decKey, _move} = this.context;

    const diffValue = step * (shiftKey ? SHIFT_MULTIPLIER : 1);

    if (which === _incKey()) {
      _move(index, value + diffValue);
    } else if (which === _decKey()) {
      _move(index, value - diffValue);
    }
  }

  _getMouseEventMap = () => {
    return [
      ['mousemove', this._onMouseMove],
      ['mouseup', this._onMouseUp],
    ];
  }

  _getTouchEventMap = () => {
    return [
      ['touchmove', this._onTouchMove],
      ['touchend', this._onTouchEnd],
    ];
  }

  _mouseEventMap = this._getMouseEventMap()

  _touchEventMap = this._getTouchEventMap()
}

export default Handle;
