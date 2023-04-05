export const getMousePositionFromEvent = (event: MouseEvent): [x: number, y: number] => {
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

  return [x, y];
};

// export const
