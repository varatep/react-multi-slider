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
    _axisKey: PropTypes.func,
    _orthogonalAxisKey: PropTypes.func,
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

  _getMousePosition= (e) => {
    const {_axisKey, _orthogonalAxisKey} = this.context;

    return [
      e[`page${_axisKey()}`],
      e[`page${_orthogonalAxisKey()}`],
    ];
  }

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
    const {i} = this.props;

    const [position] = this._getMousePosition(e);

    addHandlers(this._mouseEventMap);

    pauseEvent(e);

    this._onStart(i, position);
  }

  _onTouchStart = (e) => {
    const {i} = this.props;

    // TODO: remove when todo above is implemented
    if (e.touches.length > 1) return;

    const positions = this._getTouchPosition(e);
    const [position] = positions;

    this._startPositions = positions;
    this._isScrolling = undefined; // don't know yet if the user is trying to scroll

    addHandlers(this._touchEventMap);

    stopPropagation(e);

    this._onStart(i, position, e);
  }

  _onStart = (i, position, e) => {
    if (this.onStart) this.onStart(e);
  }
  // end onStart

  // being onMove
  _onMouseMove = (e) => {
    const [position] = this._getMousePosition(e);
    this._onMove(position);
  }

  _onTouchMove = (e) => {
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
    if (this.onMove) this.onMove(e);
  }

  _onMouseUp = (e) => {
    this._onEnd(this._mouseEventMap, e);
  }
  // end onMove

  // being onEnd
  _onTouchEnd = (e) => {
    this._onEnd(this._touchEventMap, e);
  }

  _onEnd = (eventMap, e) => {
    removeHandlers(this._touchEventMap);

    if (this.onEnd) this.onEnd(e);
  }
  // end onEnd

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
