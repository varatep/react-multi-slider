import React, {PropTypes, Component} from 'react';
import shouldPureComponentUpdate from 'react-pure-render/function';

import {pauseEvent, stopPropagation} from './common';
import propTypes from './propTypes';

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
    v: PropTypes.number,

    // index of this handle
    i: PropTypes.number,

    zIndex: PropTypes.number,

    min: propTypes.min,
    max: propTypes.max,
    handleClassName: propTypes.handleClassName,
    handleActiveClassName: propTypes.handleActiveClassName,
  }

  static contextTypes = {
    _start: PropTypes.func,
    _move: PropTypes.func,
    _end: PropTypes.func,

    _measureSliderLength: PropTypes.func,

    _posMinKey: PropTypes.func,
    _axisKey: PropTypes.func,
    _orthogonalAxisKey: PropTypes.func,

    invert: PropTypes.bool,
  }

  state = {active: false}

  render() {
    const {i, handleClassName, handleActiveClassName, disabled, children} = this.props;
    const {active} = this.state;

    // console.log(`Render handle ${i}`);

    const isActiveClassName = active ? ` ${handleActiveClassName}` : ``;
    const className = `${handleClassName} ${handleClassName}-${i}${isActiveClassName}`;

    const style = this._buildHandleStyle();

    return (
      <div
        className={className}
        style={style}
        tabIndex={disabled ? null : '0'}
        onMouseDown={disabled ? null : this._onMouseDown}
        onTouchStart={disabled ? null : this._onTouchStart}
        onFocus={disabled ? null : () => this._onFocus(i)}
        onBlur={disabled ? null : this._onBlur}
        onKeyDown={disabled ? null : this._onKeyDown}
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

  // FIXME: just return (x, y), change other code
  _getMousePosition= (e) => {
    const {_axisKey, _orthogonalAxisKey} = this.context;

    return [
      e[`page${_axisKey()}`],
      e[`page${_orthogonalAxisKey()}`],
    ];
  }

  // FIXME: just return (x, y), change other code
  _getTouchPosition = (e) => {
    const {_axisKey, _orthogonalAxisKey} = this.context;

    // TODO: use closest touch
    const [touch] = e.touches;

    return [
      touch[`page${_axisKey()}`],
      touch[`page${_orthogonalAxisKey()}`],
    ];
  }

  // start onStart
  _onMouseDown = (e) => {
    const [position] = this._getMousePosition(e);

    addHandlers(this._mouseEventMap);

    pauseEvent(e);

    this._onStart(position, e);
  }

  _onTouchStart = (e) => {
    // TODO: remove when todo above is implemented
    if (e.touches.length > 1) return;

    const positions = this._getTouchPosition(e);
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
    const [position] = this._getMousePosition(e);
    this._onMove(position);
  }

  _onTouchMove = (e) => {
    // FIXME: find out if "nearest" touch is still there
    if (e.touches.length > 1) return;

    const [positionMainDir, positionScrollDir] = this._getTouchPosition(e);
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
    const {v, i} = this.props;
    const {_measureSliderLength, _start} = this.context;

    this._startValue = v;
    this._startPosition = position;
    this._sliderLength = _measureSliderLength();

    this.setState({active: true});

    _start(i);
  }

  onMove = (position) => {
    const {_sliderLength, _startPosition, _startValue} = this;
    const {i, min, max} = this.props;
    const {invert, _move} = this.context;

    let diffPosition = position - _startPosition;

    // FIXME: don't depend on invert (and don't pass via context)
    if (invert) diffPosition *= -1;

    const diffValue = diffPosition / _sliderLength * (max - min);

    _move(i, _startValue + diffValue);
  }

  onEnd = () => {
    const {_end} = this.context;

    this.setState({active: false});

    _end();
  }

  _onFocus = () => {
    this.setState({active: true});
  }

  _onBlur = () => {
    this.setState({active: false});
  }

  _onKeyDown = () => {
    // FIXME: call _move with correct values
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
