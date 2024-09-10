class PIDController {
  constructor(kp, ki, kd, setpoint) {
    this.kp = kp; // Proportional gain
    this.ki = ki; // Integral gain
    this.kd = kd; // Derivative gain
    this.setpoint = setpoint; // Desired rate
    
    this.previousError = 0;
    this.integral = 0;
  }
  
  
  update(currentRate, deltaTime) {
    const error = this.setpoint - currentRate;
    
    const p = this.kp * error;
    
    this.integral += error * deltaTime;
    const i = this.ki * this.integral;

    // Derivative term
    const derivative = (error - this.previousError) / deltaTime;
    const d = this.kd * derivative;

    // Store error for next derivative calculation
    this.previousError = error;

    // Calculate adjustment (output)
    return p + i + d;
  }
}


export default PIDController