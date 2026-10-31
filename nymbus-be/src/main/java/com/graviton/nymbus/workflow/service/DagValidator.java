package com.graviton.nymbus.workflow.service;

import com.graviton.nymbus.agent.dto.PlannedSubTaskDto;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class DagValidator {

    public record ValidationResult(boolean isValid, String errorMessage, List<String> sortedTempIds) {}

    public ValidationResult validate(List<PlannedSubTaskDto> subTasks) {
        if (subTasks == null || subTasks.isEmpty()) {
            return new ValidationResult(false, "Plan must contain at least one subtask", Collections.emptyList());
        }

        Set<String> allIds = new HashSet<>();
        for (PlannedSubTaskDto st : subTasks) {
            if (st.tempId() == null || st.tempId().isBlank()) {
                return new ValidationResult(false, "SubTask tempId cannot be empty", Collections.emptyList());
            }
            if (!allIds.add(st.tempId())) {
                return new ValidationResult(false, "Duplicate subtask tempId: " + st.tempId(), Collections.emptyList());
            }
        }

        Map<String, List<String>> adj = new HashMap<>();
        Map<String, Integer> inDegree = new HashMap<>();

        for (String id : allIds) {
            adj.put(id, new ArrayList<>());
            inDegree.put(id, 0);
        }

        for (PlannedSubTaskDto st : subTasks) {
            String u = st.tempId();
            if (st.dependsOnTempIds() != null) {
                for (String dep : st.dependsOnTempIds()) {
                    if (dep.equals(u)) {
                        return new ValidationResult(false, "Self-dependency detected on subtask " + u, Collections.emptyList());
                    }
                    if (!allIds.contains(dep)) {
                        return new ValidationResult(false, "Subtask " + u + " depends on non-existent task " + dep, Collections.emptyList());
                    }
                    // dep must finish before u can start, so dep -> u
                    adj.get(dep).add(u);
                    inDegree.put(u, inDegree.get(u) + 1);
                }
            }
        }

        // Kahn's algorithm for topological sorting and cycle detection
        Queue<String> queue = new LinkedList<>();
        for (Map.Entry<String, Integer> entry : inDegree.entrySet()) {
            if (entry.getValue() == 0) {
                queue.offer(entry.getKey());
            }
        }

        if (queue.isEmpty()) {
            return new ValidationResult(false, "Cycle detected: no starting subtask with zero dependencies", Collections.emptyList());
        }

        List<String> sorted = new ArrayList<>();
        while (!queue.isEmpty()) {
            String curr = queue.poll();
            sorted.add(curr);

            for (String neighbor : adj.get(curr)) {
                inDegree.put(neighbor, inDegree.get(neighbor) - 1);
                if (inDegree.get(neighbor) == 0) {
                    queue.offer(neighbor);
                }
            }
        }

        if (sorted.size() != allIds.size()) {
            return new ValidationResult(false, "Circular dependency cycle detected among subtasks", Collections.emptyList());
        }

        return new ValidationResult(true, null, sorted);
    }
}
