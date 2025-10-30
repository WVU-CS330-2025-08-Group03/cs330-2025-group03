import React from "react";
import './login.css';

function Login(){
  return (
    <main className="login-page container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <form>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Username: </label>
                  <input id="email" type="email" className="form-control" placeholder="" />
                </div>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Password: </label>
                  <input id="password" type="password" className="form-control" />
                </div>
                <button type="submit" className="btn btn-primary">Sign in</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Login;