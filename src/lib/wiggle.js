let lastTimestamp = null;
let velocity = { x: 0, y: 0, z: 0 };
let lastPosition = { x: 0, y: 0, z: 0 };


function transformToWorldCoordinates(acc, orientation) {
  const { x, y, z, w } = orientation
  
  const accQuat = { w: 0, x: acc.x, y: acc.y, z: acc.z };
  
  const orientationConjugate = { w: w, x: -x, y: -y, z: -z };
  
  const temp = quaternionMultiply(orientation, accQuat);
  
  const rotated = quaternionMultiply(temp, orientationConjugate);
  
  return { x: rotated.x, y: rotated.y, z: rotated.z };
}


function quaternionMultiply(q1, q2) {
  return {
      w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
      x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
      y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
      z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w
  }
}


function onSensorData(acceleration, gravity, orientation, timestamp) {
  const dt = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0;
  lastTimestamp = timestamp;
  
  const linearAcc = {
    x: acceleration.x - gravity.x,
    y: acceleration.y - gravity.y,
    z: acceleration.z - gravity.z
  };
  
  const worldAcc = transformToWorldCoordinates(linearAcc, orientation);
  
  velocity.x += worldAcc.x * dt;
  velocity.y += worldAcc.y * dt;
  velocity.z += worldAcc.z * dt;
  
  const newPosition = {
    x: lastPosition.x + velocity.x * dt + 0.5 * worldAcc.x * dt * dt,
    y: lastPosition.y + velocity.y * dt + 0.5 * worldAcc.y * dt * dt,
    z: lastPosition.z + velocity.z * dt + 0.5 * worldAcc.z * dt * dt
  }
  // console.log(lastPosition, velocity, worldAcc)
  
  const deltaX = newPosition.x - lastPosition.x;
  const deltaY = newPosition.y - lastPosition.y;
  const deltaZ = newPosition.z - lastPosition.z;
  // console.log(newPosition)
  
  const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2 + deltaZ ** 2)
  
  const theta = Math.atan2(deltaY, deltaX);
  const phi = Math.atan2(deltaZ, Math.sqrt(deltaX ** 2 + deltaY ** 2))
  
  lastPosition = newPosition
  
  return { distance, theta, phi }
}


export {onSensorData}