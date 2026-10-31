package com.graviton.nymbus.research.service;

import com.graviton.nymbus.agent.repository.AgentExecutionRepository;
import com.graviton.nymbus.conversation.entity.ConversationMessage;
import com.graviton.nymbus.conversation.repository.ConversationMessageRepository;
import com.graviton.nymbus.evidence.service.EvidenceService;
import com.graviton.nymbus.report.entity.ResearchReport;
import com.graviton.nymbus.report.repository.ResearchReportRepository;
import com.graviton.nymbus.research.dto.ResearchTaskStatusResponse;
import com.graviton.nymbus.research.entity.ExecutionMode;
import com.graviton.nymbus.research.entity.ResearchTask;
import com.graviton.nymbus.research.entity.TaskStatus;
import com.graviton.nymbus.research.repository.ResearchTaskRepository;
import com.graviton.nymbus.source.service.SourceService;
import com.graviton.nymbus.user.entity.User;
import com.graviton.nymbus.user.service.CurrentUserService;
import com.graviton.nymbus.workflow.repository.SubTaskRepository;
import com.graviton.nymbus.workflow.service.WorkflowEventService;
import com.graviton.nymbus.workflow.service.WorkflowService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResearchTaskServiceTest {

    @Mock
    private ResearchTaskRepository researchTaskRepository;
    @Mock
    private SubTaskRepository subTaskRepository;
    @Mock
    private AgentExecutionRepository agentExecutionRepository;
    @Mock
    private ResearchReportRepository researchReportRepository;
    @Mock
    private ConversationMessageRepository conversationMessageRepository;
    @Mock
    private CurrentUserService currentUserService;
    @Mock
    private WorkflowService workflowService;
    @Mock
    private WorkflowEventService workflowEventService;
    @Mock
    private SourceService sourceService;
    @Mock
    private EvidenceService evidenceService;

    @InjectMocks
    private ResearchTaskService researchTaskService;

    private User testUser;
    private UUID userId;
    private UUID taskId;
    private UUID conversationId;
    private ResearchTask testTask;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        taskId = UUID.randomUUID();
        conversationId = UUID.randomUUID();

        testUser = User.builder()
                .id(userId)
                .name("Test User")
                .email("test@nymbus.ai")
                .build();

        testTask = ResearchTask.builder()
                .id(taskId)
                .user(testUser)
                .conversationId(conversationId)
                .title("Quantum Computing Advances")
                .prompt("Deep research on quantum computing")
                .status(TaskStatus.RUNNING)
                .executionMode(ExecutionMode.DEEP_RESEARCH)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    void getTaskStatus_ReturnsStatusWithLinkedMessageAndReport() {
        UUID messageId = UUID.randomUUID();
        UUID reportId = UUID.randomUUID();

        ConversationMessage message = ConversationMessage.builder()
                .id(messageId)
                .researchTaskId(taskId)
                .build();

        ResearchReport report = ResearchReport.builder()
                .id(reportId)
                .title("Quantum Computing Report")
                .version(1)
                .build();

        when(researchTaskRepository.findByIdAndUserId(taskId, userId))
                .thenReturn(Optional.of(testTask));
        when(conversationMessageRepository.findFirstByResearchTaskIdOrderByCreatedAtDesc(taskId))
                .thenReturn(Optional.of(message));
        when(researchReportRepository.findTopByResearchTaskIdOrderByVersionDesc(taskId))
                .thenReturn(Optional.of(report));

        ResearchTaskStatusResponse response = researchTaskService.getTaskStatus(taskId, testUser);

        assertNotNull(response);
        assertEquals(taskId, response.taskId());
        assertEquals(conversationId, response.conversationId());
        assertEquals(messageId, response.messageId());
        assertEquals(reportId, response.reportId());
        assertEquals("Quantum Computing Report", response.reportTitle());
        assertEquals(TaskStatus.RUNNING, response.status());
    }

    @Test
    void getTasksForConversation_FiltersUserTasks() {
        when(researchTaskRepository.findByConversationIdOrderByCreatedAtDesc(conversationId))
                .thenReturn(List.of(testTask));
        when(conversationMessageRepository.findFirstByResearchTaskIdOrderByCreatedAtDesc(taskId))
                .thenReturn(Optional.empty());
        when(researchReportRepository.findTopByResearchTaskIdOrderByVersionDesc(taskId))
                .thenReturn(Optional.empty());

        List<ResearchTaskStatusResponse> list = researchTaskService.getTasksForConversation(conversationId, testUser);

        assertNotNull(list);
        assertEquals(1, list.size());
        assertEquals(taskId, list.get(0).taskId());
    }
}
