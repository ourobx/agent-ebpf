"""
KSEC v2.0 — Counterfactual Incident Simulator & Causal DAG Replay Engine

Simulates the hypothetical blast radius, cascading schema dependencies,
and operational downtime (RTO hours saved + regulatory breach avoidance)
if the Ring-0 eBPF defense had not intervened.
"""

from __future__ import annotations
import re
import json
import time
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Set, Optional, Any


@dataclass
class SchemaTable:
    name: str
    estimated_rows: int
    sensitivity_tier: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    contains_pii: bool
    recovery_time_minutes: float
    foreign_keys: List[str] = field(default_factory=list)


@dataclass
class CausalDAGNode:
    node_id: str
    entity_type: str  # "TABLE", "SERVICE", "EXTERNAL_API", "IDENTITY"
    label: str
    impact_level: str  # "CATASTROPHIC", "SEVERE", "MODERATE", "NEGLIGIBLE"
    estimated_corrupted_records: int
    recovery_time_minutes: float
    parents: List[str] = field(default_factory=list)


@dataclass
class CounterfactualSimulationReport:
    incident_id: str
    blocked_at_timestamp: float
    source_agent_id: str
    blocked_payload: str
    simulated_blast_radius_summary: str
    total_potential_rows_compromised: int
    estimated_rto_hours_saved: float
    total_estimated_financial_exposure_usd: float
    compliance_violations_prevented: List[str]
    causal_dag_nodes: List[CausalDAGNode]
    causal_dag_edges: List[Dict[str, str]]


class CounterfactualReplayEngine:
    """
    Constructs deterministic blast radius DAG simulations for security incidents.
    """

    DEFAULT_SCHEMA: Dict[str, SchemaTable] = {
        "users": SchemaTable("users", 150000, "CRITICAL", True, 45.0, ["orders", "auth_tokens"]),
        "auth_tokens": SchemaTable("auth_tokens", 450000, "CRITICAL", False, 30.0, []),
        "orders": SchemaTable("orders", 1200000, "HIGH", True, 60.0, ["order_items", "invoices"]),
        "order_items": SchemaTable("order_items", 4800000, "MEDIUM", False, 45.0, []),
        "invoices": SchemaTable("invoices", 950000, "CRITICAL", True, 45.0, ["payment_records"]),
        "payment_records": SchemaTable("payment_records", 950000, "CRITICAL", True, 45.0, []),
        "audit_logs": SchemaTable("audit_logs", 8500000, "HIGH", False, 90.0, []),
    }

    def __init__(self, custom_schema: Optional[Dict[str, SchemaTable]] = None):
        self.schema = custom_schema or self.DEFAULT_SCHEMA

    def simulate_sql_incident(
        self,
        incident_id: str,
        agent_id: str,
        blocked_sql: str
    ) -> CounterfactualSimulationReport:
        """
        Parses blocked SQL, maps cascading schema dependencies, and evaluates hypothetical loss.
        """
        upper_sql = blocked_sql.upper()
        impacted_tables: Set[str] = set()

        # Identify primary target tables from SQL keywords
        for tbl in self.schema.keys():
            if re.search(rf"\b{tbl}\b", upper_sql, re.IGNORECASE):
                impacted_tables.add(tbl)

        # Detect DDL blast (DROP, TRUNCATE, ALTER)
        is_ddl = bool(re.search(r"\b(DROP|TRUNCATE|ALTER)\b", upper_sql))
        is_unbounded_delete = bool(re.search(r"\bDELETE\s+FROM\b", upper_sql) and "WHERE" not in upper_sql)
        is_data_exfil = bool(re.search(r"\bSELECT\b", upper_sql) and re.search(r"\b(INTO|UNION|ATTACH)\b", upper_sql))

        # Cascade through foreign keys to build DAG
        dag_nodes: List[CausalDAGNode] = []
        dag_edges: List[Dict[str, str]] = []
        visited: Set[str] = set()

        total_rows = 0
        total_recovery_mins = 0.0
        compliance_breaches: Set[str] = set()

        def traverse(table_name: str, parent_id: Optional[str] = None):
            nonlocal total_rows, total_recovery_mins
            if table_name in visited or table_name not in self.schema:
                return
            visited.add(table_name)

            meta = self.schema[table_name]
            corrupted_rows = meta.estimated_rows if (is_ddl or is_unbounded_delete) else int(meta.estimated_rows * 0.1)
            total_rows += corrupted_rows
            total_recovery_mins += meta.recovery_time_minutes

            if meta.contains_pii:
                compliance_breaches.add("GDPR Art. 33/82 Breach Avoided")
                compliance_breaches.add("HIPAA §164.312 Data Integrity Preserved")
                compliance_breaches.add("PCI-DSS v4.0 Req 3.4 Cardholder Protection")

            if is_ddl or is_unbounded_delete:
                compliance_breaches.add("SOC-2 Type II Availability Breach Avoided")

            impact_level = "CATASTROPHIC" if is_ddl else "SEVERE" if is_unbounded_delete else "MODERATE"

            node_id = f"node_{table_name}"
            node = CausalDAGNode(
                node_id=node_id,
                entity_type="TABLE",
                label=f"Table: {table_name}",
                impact_level=impact_level,
                estimated_corrupted_records=corrupted_rows,
                recovery_time_minutes=meta.recovery_time_minutes,
                parents=[parent_id] if parent_id else []
            )
            dag_nodes.append(node)

            if parent_id:
                dag_edges.append({"source": parent_id, "target": node_id, "relation": "CASCADES_TO"})

            for child in meta.foreign_keys:
                traverse(child, node_id)

        # Build DAG roots
        for t in impacted_tables:
            traverse(t, None)

        if not dag_nodes:
            dag_nodes.append(CausalDAGNode(
                node_id="node_generic",
                entity_type="SERVICE",
                label="General Database Cluster",
                impact_level="MODERATE",
                estimated_corrupted_records=1000,
                recovery_time_minutes=30.0
            ))
            total_rows = 1000
            total_recovery_mins = 30.0

        rto_hours_saved = round(total_recovery_mins / 60.0, 1)

        summary = (
            f"If unblocked, this payload would have caused cascading corruption across {len(dag_nodes)} "
            f"database entities, compromising {total_rows:,} records and requiring an estimated "
            f"{rto_hours_saved} hours of Disaster Recovery (RTO)."
        )

        return CounterfactualSimulationReport(
            incident_id=incident_id,
            blocked_at_timestamp=time.time(),
            source_agent_id=agent_id,
            blocked_payload=blocked_sql,
            simulated_blast_radius_summary=summary,
            total_potential_rows_compromised=total_rows,
            estimated_rto_hours_saved=rto_hours_saved,
            total_estimated_financial_exposure_usd=round(total_rows * 12.50, 2),
            compliance_violations_prevented=sorted(list(compliance_breaches)),
            causal_dag_nodes=dag_nodes,
            causal_dag_edges=dag_edges
        )
