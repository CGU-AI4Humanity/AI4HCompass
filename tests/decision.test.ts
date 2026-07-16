import assert from "node:assert/strict";
import test from "node:test";
import { dimensionStatus, projectDecision, roleAllows, statusFromScore } from "../lib/decision";

test("score thresholds are derived on the server", () => {
  assert.equal(statusFromScore(0), "red");
  assert.equal(statusFromScore(39), "red");
  assert.equal(statusFromScore(40), "yellow");
  assert.equal(statusFromScore(69), "yellow");
  assert.equal(statusFromScore(70), "green");
  assert.equal(statusFromScore(100), "green");
});

test("an empty dimension remains pending and the worst issue wins", () => {
  assert.equal(dimensionStatus([]), "pending");
  assert.equal(dimensionStatus(["green", "green"]), "green");
  assert.equal(dimensionStatus(["green", "yellow"]), "yellow");
  assert.equal(dimensionStatus(["green", "red", "yellow"]), "red");
});

test("projects remain pending until every dimension is assessed", () => {
  assert.equal(projectDecision(["green", "green", "pending"]), "pending");
  assert.equal(projectDecision(Array(8).fill("green")), "go");
  assert.equal(projectDecision(["green", "yellow", ...Array(6).fill("green")]), "fix");
  assert.equal(projectDecision(["green", "red", ...Array(6).fill("green")]), "pause");
});

test("organization roles follow the lean three-level model", () => {
  assert.equal(roleAllows("admin", "assessor"), true);
  assert.equal(roleAllows("assessor", "viewer"), true);
  assert.equal(roleAllows("viewer", "assessor"), false);
  assert.equal(roleAllows("assessor", "admin"), false);
});
