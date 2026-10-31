package com.graviton.nymbus.workflow.repository;

import com.graviton.nymbus.workflow.entity.SubTask;
import com.graviton.nymbus.workflow.entity.SubTaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SubTaskRepository extends JpaRepository<SubTask, UUID> {

    List<SubTask> findByResearchTaskIdOrderByPriorityAscCreatedAtAsc(UUID researchTaskId);

    List<SubTask> findByResearchTaskIdAndStatus(UUID researchTaskId, SubTaskStatus status);

    long countByResearchTaskIdAndStatus(UUID researchTaskId, SubTaskStatus status);

    long countByResearchTaskId(UUID researchTaskId);

    @Query("SELECT s FROM SubTask s WHERE s.researchTask.id = :taskId AND s.status = 'BLOCKED' " +
           "AND NOT EXISTS (" +
           "  SELECT d FROM TaskDependency d, SubTask dep " +
           "  WHERE d.subTaskId = s.id AND d.dependsOnSubTaskId = dep.id " +
           "  AND dep.status <> 'COMPLETED'" +
           ")")
    List<SubTask> findUnblockedSubTasks(@Param("taskId") UUID taskId);
}
