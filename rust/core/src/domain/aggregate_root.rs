/// DDD Aggregate Root Pattern
/// =========================
///
/// DoR: Domain entities implemented as structs/classes with unique identity and lifecycle
/// DoD: Trait defined, event sourcing interface, version control, transaction boundaries, comprehensive tests
/// 
/// Marks domain entities as aggregate roots, establishing transactional boundaries
/// and consistency enforcement. Aggregate roots are the only entry points for
/// modifying associated entities within the same bounded context.
///
/// ## Pattern
/// An aggregate root:
/// - Has a unique identifier
/// - Maintains invariants across its entity graph
/// - Controls access to child entities
/// - Publishes domain events for state changes
///
/// ## Usage
/// ```rust,no_run
/// use uuid::Uuid;
/// use serde::{Serialize, Deserialize};
///
/// pub trait AggregateRoot {
///     fn aggregate_id(&self) -> Uuid;
/// }
///
/// #[derive(Debug, Clone, Serialize, Deserialize)]
/// pub struct WsjfItem {
///     pub id: Uuid,
///     // ... fields
/// }
///
/// impl AggregateRoot for WsjfItem {
///     fn aggregate_id(&self) -> Uuid { self.id }
/// }
/// ```

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Marker trait for aggregate roots in DDD
/// 
/// Implementing this trait designates a struct as an aggregate root,
/// which is responsible for maintaining consistency within its boundary.
pub trait AggregateRoot {
    /// Returns the unique identifier of this aggregate root
    fn aggregate_id(&self) -> Uuid;
    
    /// Returns the current version for optimistic concurrency control
    fn version(&self) -> u64 {
        0 // Default implementation, override for event sourcing
    }
}

/// Domain event emitted by aggregate roots
/// 
/// Events represent state changes within an aggregate and can be used
/// for event sourcing, CQRS, or inter-aggregate communication.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainEvent {
    /// ID of the aggregate that emitted this event
    pub aggregate_id: Uuid,
    
    /// Type of event (e.g., "WsjfItemCreated", "RiskMitigated")
    pub event_type: String,
    
    /// Event payload as JSON
    pub payload: serde_json::Value,
    
    /// Timestamp when event occurred
    pub occurred_at: chrono::DateTime<chrono::Utc>,
}

impl DomainEvent {
    /// Create a new domain event
    pub fn new(aggregate_id: Uuid, event_type: impl Into<String>, payload: serde_json::Value) -> Self {
        Self {
            aggregate_id,
            event_type: event_type.into(),
            payload,
            occurred_at: chrono::Utc::now(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[derive(Debug)]
    struct TestAggregate {
        id: Uuid,
        version: u64,
    }
    
    impl AggregateRoot for TestAggregate {
        fn aggregate_id(&self) -> Uuid {
            self.id
        }
        
        fn version(&self) -> u64 {
            self.version
        }
    }
    
    #[test]
    fn test_aggregate_root_trait() {
        let agg = TestAggregate {
            id: Uuid::new_v4(),
            version: 1,
        };
        
        assert_eq!(agg.aggregate_id(), agg.id);
        assert_eq!(agg.version(), 1);
    }
    
    #[test]
    fn test_domain_event_creation() {
        let agg_id = Uuid::new_v4();
        let event = DomainEvent::new(
            agg_id,
            "TestEvent",
            serde_json::json!({"key": "value"}),
        );
        
        assert_eq!(event.aggregate_id, agg_id);
        assert_eq!(event.event_type, "TestEvent");
        assert_eq!(event.payload["key"], "value");
    }
}
