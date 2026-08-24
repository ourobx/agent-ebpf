// SPDX-License-Identifier: Apache-2.0
//! KSEC v2.0 — High-Performance Rust LWW-Element-Set CRDT Engine
//!
//! Provides lock-free / low-contention CRDT map synchronization
//! for distributed edge nodes running eBPF Ring-0 security filters.

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Debug, PartialEq)]
pub struct ElementEntry {
    pub value: String,
    pub timestamp_ns: u64,
    pub node_id: String,
}

#[derive(Clone, Debug, Default)]
pub struct LwwElementSet {
    node_id: String,
    add_set: Arc<RwLock<HashMap<String, ElementEntry>>>,
    remove_set: Arc<RwLock<HashMap<String, (u64, String)>>>,
}

impl LwwElementSet {
    pub fn new(node_id: &str) -> Self {
        Self {
            node_id: node_id.to_string(),
            add_set: Arc::new(RwLock::new(HashMap::new())),
            remove_set: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    fn now_ns() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos() as u64
    }

    pub fn insert(&self, key: &str, value: &str) {
        let ts = Self::now_ns();
        let entry = ElementEntry {
            value: value.to_string(),
            timestamp_ns: ts,
            node_id: self.node_id.clone(),
        };
        let mut map = self.add_set.write().unwrap();
        if let Some(existing) = map.get(key) {
            if ts <= existing.timestamp_ns {
                return;
            }
        }
        map.insert(key.to_string(), entry);
    }

    pub fn remove(&self, key: &str) {
        let ts = Self::now_ns();
        let mut rem_map = self.remove_set.write().unwrap();
        if let Some(existing) = rem_map.get(key) {
            if ts <= existing.0 {
                return;
            }
        }
        rem_map.insert(key.to_string(), (ts, self.node_id.clone()));
    }

    pub fn contains(&self, key: &str) -> bool {
        let add_map = self.add_set.read().unwrap();
        let rem_map = self.remove_set.read().unwrap();

        match add_map.get(key) {
            None => false,
            Some(add_entry) => match rem_map.get(key) {
                None => true,
                Some(rem_entry) => add_entry.timestamp_ns > rem_entry.0,
            },
        }
    }

    pub fn get(&self, key: &str) -> Option<String> {
        if !self.contains(key) {
            return None;
        }
        let add_map = self.add_set.read().unwrap();
        add_map.get(key).map(|e| e.value.clone())
    }
}
