package com.graviton.nymbus.workflow.repository;

import com.graviton.nymbus.workflow.entity.TaskDependency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskDependencyRepository extends JpaRepository<TaskDependency, UUID> {

    List<TaskDependency> findBySubTaskId(UUID subTaskId);

    List<TaskDependency> findByDependsOnSubTaskId(UUID dependsOnSubTaskId);

    List<TaskDependency> findBySubTaskIdIn(List<UUID> subTaskIds);
}
