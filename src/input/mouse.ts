export const Mouse = {
  x: 0,
  y: 0,
  isPressed: false,

  getMouseToPointAngle(x: number, y = 0): number {
    return Math.atan2(this.x - x, y - this.y);
  },

  getIsPressed(): boolean {
    return this.isPressed;
  },
};

function getmousePosition(event: MouseEvent): void {
  const e = event || window.event;
  let x = e.pageX;
  let y = e.pageY;

  // IE 8
  if (x === undefined || x === null) {
    const { scrollLeft, scrollTop } = document.body;
    const { documentElement } = document;
    x = e.clientX + scrollLeft + documentElement.scrollLeft;
    y = e.clientY + scrollTop + documentElement.scrollTop;
  }

  Mouse.x = x;
  Mouse.y = y;
}

export function setupMouseInput(): void {
  document.addEventListener('mousemove', getmousePosition);
  document.addEventListener('mousedown', () => {
    Mouse.isPressed = true;
  });
  document.addEventListener('mouseup', () => {
    Mouse.isPressed = false;
  });
}
